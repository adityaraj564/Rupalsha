const express = require('express');
const router = express.Router();
const ReturnRequest = require('../models/ReturnRequest');
const { RETURN_REASONS, RETURN_STATUSES } = require('../models/ReturnRequest');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');
const returnUpload = require('../utils/returnUpload');
const {
  sendReturnRequestReceived,
  sendReturnStatusUpdate,
  sendReturnAdminAlert,
} = require('../utils/email');

const MAX_IMAGES = 4;
const MAX_VIDEO_SECONDS = 30;

// POST /api/returns — user creates a return request
// multipart/form-data: images[] (max 4), video (optional, ≤30s), orderId, items (JSON), reason, description
router.post(
  '/',
  auth,
  returnUpload.fields([
    { name: 'images', maxCount: MAX_IMAGES },
    { name: 'video', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { orderId, reason, description, items } = req.body;

      if (!orderId || !reason) {
        return res.status(400).json({ error: 'orderId and reason are required' });
      }
      if (!RETURN_REASONS.includes(reason)) {
        return res.status(400).json({ error: 'Invalid reason' });
      }

      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (String(order.user) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Not your order' });
      }
      if (order.status !== 'delivered') {
        return res.status(400).json({ error: 'Return can only be raised on delivered orders' });
      }

      // Return window check
      const daysSinceDelivery = order.deliveredAt
        ? (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      if (daysSinceDelivery > 7) {
        return res.status(400).json({ error: 'Return window (7 days) has expired' });
      }

      // Prevent duplicate active return for the same order
      const existing = await ReturnRequest.findOne({
        order: orderId,
        status: { $nin: ['rejected', 'refunded'] },
      });
      if (existing) {
        return res.status(409).json({ error: 'A return request for this order is already in progress' });
      }

      // Parse items array (sent as JSON string from multipart)
      let parsedItems = [];
      try {
        parsedItems = items ? JSON.parse(items) : [];
      } catch {
        return res.status(400).json({ error: 'Invalid items JSON' });
      }
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
        // Default: all order items
        parsedItems = order.items.map((it) => ({
          product: it.product,
          name: it.name,
          image: it.image,
          size: it.size,
          quantity: it.quantity,
          price: it.price,
        }));
      }

      // Build images array from uploaded files
      const uploadedImages = (req.files?.images || []).map((f) => ({
        url: f.path,
        public_id: f.filename,
      }));
      if (uploadedImages.length > MAX_IMAGES) {
        return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed` });
      }

      // Video (optional)
      let video;
      const videoFile = req.files?.video?.[0];
      if (videoFile) {
        // multer-storage-cloudinary attaches duration when resource_type is video
        const duration = Number(videoFile.duration || videoFile.metadata?.duration || 0);
        if (duration && duration > MAX_VIDEO_SECONDS + 1) {
          // Best-effort cleanup
          try {
            const cloudinary = require('../config/cloudinary');
            await cloudinary.uploader.destroy(videoFile.filename, { resource_type: 'video' });
          } catch {}
          return res.status(400).json({ error: `Video must be ${MAX_VIDEO_SECONDS} seconds or less` });
        }
        video = {
          url: videoFile.path,
          public_id: videoFile.filename,
          duration,
        };
      }

      const rr = await ReturnRequest.create({
        order: order._id,
        user: req.user._id,
        items: parsedItems,
        reason,
        description,
        images: uploadedImages,
        video,
      });

      // Reflect on order (keeps old column working)
      order.returnReason = reason;
      await order.save();

      // Notifications (fire-and-forget; errors logged inside helpers)
      sendReturnRequestReceived(rr, req.user.email, order.orderNumber);
      sendReturnAdminAlert(rr, req.user.name, req.user.email, order.orderNumber);

      res.status(201).json({ return: rr });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/returns/my — user: list own returns
router.get('/my', auth, async (req, res, next) => {
  try {
    const list = await ReturnRequest.find({ user: req.user._id })
      .populate('order', 'orderNumber totalAmount createdAt')
      .sort({ createdAt: -1 });
    res.json({ returns: list });
  } catch (err) {
    next(err);
  }
});

// GET /api/returns/by-order/:orderId — user: fetch return for a specific order
router.get('/by-order/:orderId', auth, async (req, res, next) => {
  try {
    const rr = await ReturnRequest.findOne({ order: req.params.orderId, user: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ return: rr || null });
  } catch (err) {
    next(err);
  }
});

// GET /api/returns/:id — owner or admin
router.get('/:id', auth, async (req, res, next) => {
  try {
    const rr = await ReturnRequest.findById(req.params.id)
      .populate('order', 'orderNumber totalAmount shippingAddress items')
      .populate('user', 'name email phone');
    if (!rr) return res.status(404).json({ error: 'Return not found' });
    if (req.user.role !== 'admin' && String(rr.user?._id || rr.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ return: rr });
  } catch (err) {
    next(err);
  }
});

// GET /api/returns — admin: list all with optional status filter
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [returns, total] = await Promise.all([
      ReturnRequest.find(filter)
        .populate('order', 'orderNumber totalAmount createdAt')
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ReturnRequest.countDocuments(filter),
    ]);

    res.json({ returns, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/returns/:id/status — admin updates status / pickup / tracking
router.patch('/:id/status', adminAuth, async (req, res, next) => {
  try {
    const {
      status,
      pickupDate,
      trackingNumber,
      courierName,
      adminNote,
      rejectionReason,
      refundAmount,
    } = req.body;

    if (!status || !RETURN_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const rr = await ReturnRequest.findById(req.params.id);
    if (!rr) return res.status(404).json({ error: 'Return not found' });

    rr.status = status;
    if (pickupDate !== undefined) rr.pickupDate = pickupDate || null;
    if (trackingNumber !== undefined) rr.trackingNumber = trackingNumber;
    if (courierName !== undefined) rr.courierName = courierName;
    if (adminNote !== undefined) rr.adminNote = adminNote;
    if (rejectionReason !== undefined) rr.rejectionReason = rejectionReason;
    if (refundAmount !== undefined) rr.refundAmount = Number(refundAmount) || 0;
    if (status === 'refunded') rr.refundedAt = new Date();

    rr.statusHistory.push({
      status,
      at: new Date(),
      note: adminNote || rejectionReason || '',
      by: req.user._id,
    });

    await rr.save();

    // Reflect on order when refunded
    if (status === 'refunded') {
      const order = await Order.findById(rr.order);
      if (order && order.status !== 'returned') {
        order.status = 'returned';
        await order.save();
      }
    }

    // Notify customer on every status change (fire-and-forget)
    try {
      const populated = await ReturnRequest.findById(rr._id)
        .populate('user', 'email name')
        .populate('order', 'orderNumber');
      if (populated?.user?.email && populated?.order?.orderNumber) {
        sendReturnStatusUpdate(populated, populated.user.email, populated.order.orderNumber);
      }
    } catch (e) {
      console.error('Return status email error:', e.message);
    }

    res.json({ return: rr });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
