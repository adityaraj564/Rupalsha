const express = require('express');
const router = express.Router();
const ReturnRequest = require('../models/ReturnRequest');
const { RETURN_REASONS, RETURN_STATUSES } = require('../models/ReturnRequest');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');
const returnUpload = require('../utils/returnUpload');
const { applyWalletTransaction } = require('../utils/wallet');
const { createNotification } = require('../utils/notification');
const {
  sendReturnRequestReceived,
  sendReturnStatusUpdate,
  sendReturnAdminAlert,
} = require('../utils/email');

const MAX_IMAGES = 4;

// POST /api/returns — user creates a return request
// multipart/form-data: images[] (max 4), orderId, items (JSON), reason, description
router.post(
  '/',
  auth,
  returnUpload.array('images', MAX_IMAGES),
  async (req, res, next) => {
    try {
      const { orderId, reason, description, items } = req.body;

      if (!orderId || !reason) {
        return res.status(400).json({ error: 'orderId and reason are required' });
      }
      if (!RETURN_REASONS.includes(reason)) {
        return res.status(400).json({ error: 'Invalid reason' });
      }

      // Refund method: COD orders always get wallet refund. Online orders default to wallet
      // but can pick 'original' for bank/card reversal (5–7 days).
      let refundMethod = req.body.refundMethod === 'original' ? 'original' : 'wallet';

      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (String(order.user) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Not your order' });
      }
      if (order.status !== 'delivered') {
        return res.status(400).json({ error: 'Return can only be raised on delivered orders' });
      }
      if (order.paymentMethod === 'cod') {
        refundMethod = 'wallet'; // enforce
      }

      // Return window check
      const daysSinceDelivery = order.deliveredAt
        ? (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      if (daysSinceDelivery > 7) {
        return res.status(400).json({ error: 'Return window (7 days) has expired' });
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

      // Validate every requested item exists in the order (match by product+size)
      const orderItemKey = (it) => `${String(it.product?._id || it.product)}|${it.size || ''}`;
      const orderItemMap = new Map(order.items.map((it) => [orderItemKey(it), it]));
      for (const it of parsedItems) {
        if (!orderItemMap.has(orderItemKey(it))) {
          return res.status(400).json({ error: 'One or more selected items are not part of this order' });
        }
      }

      // Block items already covered by another active or completed (non-rejected, non-closed) return
      const activeReturns = await ReturnRequest.find({
        order: orderId,
        status: { $nin: ['rejected', 'closed'] },
      });
      const returnedKeys = new Set();
      for (const r of activeReturns) {
        for (const it of r.items || []) returnedKeys.add(orderItemKey(it));
      }
      const overlap = parsedItems.filter((it) => returnedKeys.has(orderItemKey(it)));
      if (overlap.length > 0) {
        return res.status(409).json({
          error: 'Some selected items are already part of another return request',
        });
      }

      // Build images array from uploaded files
      const uploadedImages = (req.files || []).map((f) => ({
        url: f.path,
        public_id: f.filename,
      }));
      if (uploadedImages.length > MAX_IMAGES) {
        return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed` });
      }

      const rr = await ReturnRequest.create({
        order: order._id,
        user: req.user._id,
        items: parsedItems,
        reason,
        description,
        images: uploadedImages,
        refundMethod,
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

// GET /api/returns/by-order/:orderId — user: fetch latest return for a specific order
router.get('/by-order/:orderId', auth, async (req, res, next) => {
  try {
    const rr = await ReturnRequest.findOne({ order: req.params.orderId, user: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ return: rr || null });
  } catch (err) {
    next(err);
  }
});

// GET /api/returns/by-order/:orderId/all — user: fetch ALL returns for a specific order
router.get('/by-order/:orderId/all', auth, async (req, res, next) => {
  try {
    const list = await ReturnRequest.find({ order: req.params.orderId, user: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ returns: list });
  } catch (err) {
    next(err);
  }
});

// GET /api/returns/:id — owner or admin
router.get('/:id', auth, async (req, res, next) => {
  try {
    const rr = await ReturnRequest.findById(req.params.id)
      .populate('order', 'orderNumber totalAmount shippingAddress items paymentMethod isPaid walletAmount')
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
        .populate('order', 'orderNumber totalAmount createdAt paymentMethod walletAmount')
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
      refundMethod,
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
    if (refundMethod && ['wallet', 'original'].includes(refundMethod)) {
      rr.refundMethod = refundMethod;
    }
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
      if (order) {
        // Only mark the entire order as 'returned' when ALL items in the order
        // have been refunded across one or more return requests. Partial returns
        // must keep the order in 'delivered' state so the customer can still
        // download an invoice for the remaining items and (potentially) request
        // additional returns.
        const refundedReturns = await ReturnRequest.find({
          order: order._id,
          status: 'refunded',
        });
        const itemKey = (it) => `${String(it.product?._id || it.product || '')}|${it.size || ''}`;
        const refundedKeys = new Set();
        for (const r of refundedReturns) {
          for (const it of r.items || []) refundedKeys.add(itemKey(it));
        }
        const allReturned = order.items.every((it) => refundedKeys.has(itemKey(it)));
        if (allReturned && order.status !== 'returned') {
          order.status = 'returned';
          await order.save();
        }
      }

      // Auto-credit the Rupalsha Wallet when refund method is 'wallet'.
      // For 'original' method, admin is expected to process the bank/card reversal
      // manually via Razorpay dashboard — we just record the status here.
      if (rr.refundMethod === 'wallet' && rr.refundAmount > 0) {
        try {
          await applyWalletTransaction({
            userId: rr.user,
            type: 'credit',
            source: 'refund',
            amount: rr.refundAmount,
            description: `Refund for return ${rr.returnNumber}`,
            returnRequest: rr._id,
            order: rr.order,
            performedBy: req.user._id,
            status: 'completed',
          });
        } catch (e) {
          console.error('Wallet refund credit failed:', e.message);
        }
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

    // In-app notification for return status change
    {
      const statusCopy = {
        approved: { title: `Return approved · ${rr.returnNumber}`, msg: 'Your return has been approved. Pickup details will be shared shortly.' },
        scheduled: { title: `Pickup scheduled · ${rr.returnNumber}`, msg: rr.pickupDate ? `Pickup scheduled for ${new Date(rr.pickupDate).toLocaleDateString('en-IN')}.` : 'Pickup has been scheduled.' },
        picked_up: { title: `Item picked up · ${rr.returnNumber}`, msg: 'Your item has been collected for return.' },
        received: { title: `Return received · ${rr.returnNumber}`, msg: 'We have received your return and are inspecting the item.' },
        refunded: { title: `Refund processed · ${rr.returnNumber}`, msg: rr.refundMethod === 'wallet' ? `₹${(rr.refundAmount || 0).toLocaleString('en-IN')} refunded to your Rupalsha wallet (instant).` : `₹${(rr.refundAmount || 0).toLocaleString('en-IN')} refund initiated to original payment method (5–7 business days).` },
        rejected: { title: `Return rejected · ${rr.returnNumber}`, msg: rejectionReason || 'Your return request has been rejected. Tap for details.' },
        closed: { title: `Return closed · ${rr.returnNumber}`, msg: 'This return request has been closed.' },
      };
      const copy = statusCopy[status];
      if (copy) {
        createNotification({
          user: rr.user,
          category: 'order',
          type: `return.${status}`,
          title: copy.title,
          message: copy.msg,
          link: `/orders/${rr.order}`,
          priority: status === 'refunded' ? 1 : 2,
          meta: { returnId: rr._id, returnNumber: rr.returnNumber, orderId: rr.order, status, refundAmount: rr.refundAmount, refundMethod: rr.refundMethod },
        });
      }
    }

    res.json({ return: rr });
  } catch (err) {
    next(err);
  }
});

// POST /api/returns/:id/cancel — user cancels their own return
// Allowed only while status is 'requested' or 'approved' (i.e. before pickup scheduled)
router.post('/:id/cancel', auth, async (req, res, next) => {
  try {
    const rr = await ReturnRequest.findById(req.params.id);
    if (!rr) return res.status(404).json({ error: 'Return not found' });
    if (String(rr.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your return' });
    }

    const cancellable = ['pending', 'approved'];
    if (!cancellable.includes(rr.status)) {
      return res.status(400).json({
        error: 'This return can no longer be cancelled. Pickup has already been scheduled.',
      });
    }

    rr.status = 'closed';
    rr.statusHistory.push({
      status: 'closed',
      at: new Date(),
      note: 'Cancelled by customer',
      by: req.user._id,
    });
    await rr.save();

    // Revert the order status if it was flipped to 'returned' (shouldn't happen for these stages,
    // but guard anyway).
    const Order = require('../models/Order');
    const order = await Order.findById(rr.order);
    if (order && order.status === 'returned') {
      order.status = 'delivered';
      await order.save();
    }

    res.json({ return: rr, message: 'Return request cancelled' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
