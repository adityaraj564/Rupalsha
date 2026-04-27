const express = require('express');
const { body } = require('express-validator');
const { adminAuth } = require('../middleware/auth');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Contact = require('../models/Contact');
const Banner = require('../models/Banner');
const ActivityLog = require('../models/ActivityLog');
const uploaders = require('../utils/upload');
const uploadProducts = uploaders.products;
const uploadCategories = uploaders.categories;
const uploadBanners = uploaders.banners;
const cloudinary = require('../config/cloudinary');
const { sendOrderStatusUpdate } = require('../utils/email');
const { createNotification } = require('../utils/notification');
const cache = require('../utils/cache');

const router = express.Router();

// All routes require admin auth
router.use(adminAuth);

// ===== DIRECT-TO-CLOUDINARY UPLOAD SIGNATURE =====
// Mints a short-lived signature so the browser can upload directly to
// Cloudinary, bypassing our Node server entirely. This is the standard
// pattern used by Instagram/Shopify/Flipkart for large media uploads:
// no request-body limits, real progress events, parallel uploads.
router.post('/upload-signature', (req, res, next) => {
  try {
    const { folder, resource_type } = req.body || {};
    const allowedFolders = new Set([
      'rupalsha/products/images',
      'rupalsha/products/videos',
    ]);
    if (!allowedFolders.has(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      process.env.CLOUDINARY_API_SECRET,
    );
    res.json({
      signature,
      timestamp,
      folder,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      resource_type: resource_type === 'video' ? 'video' : 'image',
    });
  } catch (err) {
    next(err);
  }
});

// ===== DASHBOARD =====
// GET /api/admin/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const [totalOrders, totalRevenue, totalUsers, recentOrders, ordersByStatus] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      User.countDocuments({ role: 'user' }),
      Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name email').lean(),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalUsers,
      recentOrders,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    next(error);
  }
});

// ===== PRODUCTS =====
// GET /api/admin/products
router.get('/products', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({ products, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/products
// Receives plain JSON. Media is uploaded directly to Cloudinary by the
// browser using the signature endpoint above; client just sends back
// `{ url, public_id }` arrays.
router.post('/products', async (req, res, next) => {
  try {
    const { name, description, price, comparePrice, category, subcategory, childCategory, categoryRef, sku, lowStockThreshold, sizes, colors, fabric, careInstructions, tags, isFeatured, isTrending, isReturnable, returnDays, returnPolicy, shippingCharge, highlights, specifications } = req.body;

    const sanitizeMedia = (arr) =>
      Array.isArray(arr)
        ? arr
            .filter((m) => m && typeof m.url === 'string' && m.url)
            .map((m) => ({ url: m.url, public_id: m.public_id || undefined }))
        : [];
    const images = sanitizeMedia(req.body.images);
    const videos = sanitizeMedia(req.body.videos);

    // Parse sizes if it comes as JSON string
    let parsedSizes = sizes;
    if (typeof sizes === 'string') {
      parsedSizes = JSON.parse(sizes);
    }

    let parsedColors = colors;
    if (typeof colors === 'string' && colors) {
      parsedColors = JSON.parse(colors);
    }

    let parsedTags = tags;
    if (typeof tags === 'string' && tags) {
      parsedTags = JSON.parse(tags);
    }

    let parsedHighlights = highlights;
    if (typeof highlights === 'string' && highlights) {
      parsedHighlights = JSON.parse(highlights);
    }

    let parsedSpecifications = specifications;
    if (typeof specifications === 'string' && specifications) {
      parsedSpecifications = JSON.parse(specifications);
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      comparePrice: comparePrice ? Number(comparePrice) : undefined,
      category,
      subcategory,
      childCategory,
      categoryRef: categoryRef || undefined,
      sku,
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
      images,
      videos,
      sizes: parsedSizes,
      colors: parsedColors,
      fabric,
      careInstructions,
      tags: parsedTags,
      isFeatured: isFeatured === 'true',
      isTrending: isTrending === 'true',
      isReturnable: isReturnable !== 'false',
      returnDays: returnDays ? Number(returnDays) : 7,
      returnPolicy,
      shippingCharge: shippingCharge ? Number(shippingCharge) : 0,
      highlights: parsedHighlights || [],
      specifications: parsedSpecifications || [],
    });

    cache.clear('products');
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const updateFields = ['name', 'description', 'price', 'comparePrice', 'category', 'subcategory', 'childCategory', 'categoryRef', 'sku', 'lowStockThreshold', 'fabric', 'careInstructions', 'isFeatured', 'isTrending', 'isReturnable', 'isActive', 'returnDays', 'returnPolicy', 'shippingCharge'];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (['isFeatured', 'isTrending', 'isReturnable', 'isActive'].includes(field)) {
          product[field] = req.body[field] === 'true' || req.body[field] === true;
        } else if (['price', 'comparePrice', 'lowStockThreshold', 'shippingCharge', 'returnDays'].includes(field)) {
          product[field] = Number(req.body[field]);
        } else {
          product[field] = req.body[field];
        }
      }
    });

    if (req.body.sizes) {
      product.sizes = typeof req.body.sizes === 'string' ? JSON.parse(req.body.sizes) : req.body.sizes;
    }
    if (req.body.colors) {
      product.colors = typeof req.body.colors === 'string' ? JSON.parse(req.body.colors) : req.body.colors;
    }
    if (req.body.tags) {
      product.tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
    }
    if (req.body.highlights !== undefined) {
      product.highlights = typeof req.body.highlights === 'string' ? JSON.parse(req.body.highlights) : req.body.highlights;
    }
    if (req.body.specifications !== undefined) {
      product.specifications = typeof req.body.specifications === 'string' ? JSON.parse(req.body.specifications) : req.body.specifications;
    }

    // New media uploaded directly to Cloudinary by the browser; client just
    // sends back the {url, public_id} pairs.
    const sanitizeMedia = (arr) =>
      Array.isArray(arr)
        ? arr
            .filter((m) => m && typeof m.url === 'string' && m.url)
            .map((m) => ({ url: m.url, public_id: m.public_id || undefined }))
        : [];
    const newImages = sanitizeMedia(req.body.newImages);
    const newVideos = sanitizeMedia(req.body.newVideos);
    if (newImages.length) product.images = [...product.images, ...newImages];
    if (newVideos.length) product.videos = [...(product.videos || []), ...newVideos];

    // Remove specific images
    if (req.body.removeImages) {
      const removeIds = typeof req.body.removeImages === 'string' ? JSON.parse(req.body.removeImages) : req.body.removeImages;
      for (const publicId of removeIds) {
        await cloudinary.uploader.destroy(publicId);
      }
      product.images = product.images.filter(img => !removeIds.includes(img.public_id));
    }

    // Remove specific videos
    if (req.body.removeVideos) {
      const removeIds = typeof req.body.removeVideos === 'string' ? JSON.parse(req.body.removeVideos) : req.body.removeVideos;
      for (const publicId of removeIds) {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      }
      product.videos = (product.videos || []).filter((v) => !removeIds.includes(v.public_id));
    }

    // Reorder existing images
    if (req.body.imageOrder) {
      const order = typeof req.body.imageOrder === 'string' ? JSON.parse(req.body.imageOrder) : req.body.imageOrder;
      const imageMap = new Map(product.images.map(img => [img.public_id || img.url, img]));
      const reordered = order.map(id => imageMap.get(id)).filter(Boolean);
      // Append any images not in the order list (newly uploaded ones)
      const orderedSet = new Set(order);
      product.images.forEach(img => {
        const key = img.public_id || img.url;
        if (!orderedSet.has(key)) reordered.push(img);
      });
      product.images = reordered;
    }

    // Reorder existing videos
    if (req.body.videoOrder) {
      const order = typeof req.body.videoOrder === 'string' ? JSON.parse(req.body.videoOrder) : req.body.videoOrder;
      const vids = product.videos || [];
      const map = new Map(vids.map((v) => [v.public_id || v.url, v]));
      const reordered = order.map((id) => map.get(id)).filter(Boolean);
      const orderedSet = new Set(order);
      vids.forEach((v) => {
        const key = v.public_id || v.url;
        if (!orderedSet.has(key)) reordered.push(v);
      });
      product.videos = reordered;
    }

    await product.save();
    cache.clear('products');
    res.json({ product });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Delete images from cloudinary
    for (const img of product.images) {
      if (img.public_id) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    // Delete videos from cloudinary
    for (const v of (product.videos || [])) {
      if (v.public_id) {
        await cloudinary.uploader.destroy(v.public_id, { resource_type: 'video' });
      }
    }

    await product.deleteOne();
    cache.clear('products');
    res.json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/inventory - Get inventory overview (out-of-stock & low-stock products)
router.get('/inventory', async (req, res, next) => {
  try {
    const { filter: stockFilter = 'all' } = req.query;

    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const inventory = products.map(p => {
      const totalStock = p.sizes?.reduce((sum, s) => sum + s.stock, 0) || 0;
      const sizeBreakdown = p.sizes?.map(s => `${s.size}: ${s.stock}`).join(', ') || '';
      return {
        _id: p._id,
        productCode: p.productCode || '',
        name: p.name,
        category: [p.category, p.subcategory, p.childCategory].filter(Boolean).join(' → '),
        price: p.price,
        totalStock,
        lowStockThreshold: p.lowStockThreshold || 5,
        sizeBreakdown,
        sizes: p.sizes || [],
        image: p.images?.[0]?.url || '',
        sku: p.sku || '',
        fabric: p.fabric || '',
        shippingCharge: p.shippingCharge || 0,
        status: totalStock === 0 ? 'out-of-stock' : totalStock <= (p.lowStockThreshold || 5) ? 'low-stock' : 'in-stock',
        updatedAt: p.updatedAt,
      };
    });

    let filtered = inventory;
    if (stockFilter === 'out-of-stock') filtered = inventory.filter(i => i.status === 'out-of-stock');
    else if (stockFilter === 'low-stock') filtered = inventory.filter(i => i.status === 'low-stock' || i.status === 'out-of-stock');
    else if (stockFilter === 'in-stock') filtered = inventory.filter(i => i.status === 'in-stock');

    const summary = {
      total: inventory.length,
      inStock: inventory.filter(i => i.status === 'in-stock').length,
      lowStock: inventory.filter(i => i.status === 'low-stock').length,
      outOfStock: inventory.filter(i => i.status === 'out-of-stock').length,
    };

    res.json({ inventory: filtered, summary });
  } catch (error) {
    next(error);
  }
});

// ===== ORDERS =====
// GET /api/admin/orders
router.get('/orders', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
], async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = req.body.status;
    if (req.body.trackingNumber) order.trackingNumber = req.body.trackingNumber;
    if (req.body.status === 'delivered') order.deliveredAt = new Date();
    if (req.body.notes) order.notes = req.body.notes;

    await order.save();

    // Send status update email to customer
    const populatedOrder = await Order.findById(order._id).populate('user', 'email');
    if (populatedOrder.user?.email) {
      sendOrderStatusUpdate(populatedOrder, populatedOrder.user.email);
    }

    // In-app notification with friendly status copy
    {
      const statusCopy = {
        confirmed: { title: `Order confirmed · ${order.orderNumber}`, msg: 'Your order has been confirmed and is being prepared.' },
        processing: { title: `Order being prepared · ${order.orderNumber}`, msg: 'We are packing your order with care.' },
        shipped: { title: `Order shipped · ${order.orderNumber}`, msg: order.trackingNumber ? `Tracking: ${order.trackingNumber}. Your order is on the way.` : 'Your order is on the way!' },
        delivered: { title: `Delivered · ${order.orderNumber}`, msg: 'Your order has been delivered. We hope you love it!' },
        cancelled: { title: `Order cancelled · ${order.orderNumber}`, msg: 'Your order has been cancelled.' },
        returned: { title: `Return completed · ${order.orderNumber}`, msg: 'Your return has been processed.' },
      };
      const copy = statusCopy[req.body.status];
      if (copy) {
        createNotification({
          user: order.user,
          category: 'order',
          type: `order.${req.body.status}`,
          title: copy.title,
          message: copy.msg,
          link: `/orders/${order._id}`,
          priority: 1,
          meta: { orderId: order._id, orderNumber: order.orderNumber, status: req.body.status, trackingNumber: order.trackingNumber || '' },
        });
      }
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/orders/:id
router.delete('/orders/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await order.deleteOne();
    res.json({ message: 'Order deleted' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/orders/:id/refund — admin updates refund tracking for a cancelled/returned order
router.put('/orders/:id/refund', [
  body('method').optional().isIn(['wallet', 'source', 'none']),
  body('status').optional().isIn(['not_applicable', 'processing', 'refunded']),
  body('amount').optional().isFloat({ min: 0 }),
  body('reference').optional().isString(),
  body('notes').optional().isString(),
], async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!['cancelled', 'returned'].includes(order.status)) {
      return res.status(400).json({ error: 'Refund tracking only applies to cancelled or returned orders' });
    }

    const refund = order.refund || {};
    if (req.body.method !== undefined) refund.method = req.body.method;
    if (req.body.status !== undefined) {
      refund.status = req.body.status;
      if (req.body.status === 'refunded' && !refund.refundedAt) {
        refund.refundedAt = new Date();
      }
    }
    if (req.body.amount !== undefined) refund.amount = Number(req.body.amount);
    if (req.body.reference !== undefined) refund.reference = req.body.reference;
    if (req.body.notes !== undefined) refund.notes = req.body.notes;
    refund.updatedAt = new Date();

    order.refund = refund;
    await order.save();

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// ===== USERS =====
// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { role: { $in: ['user', 'subadmin'] } };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      User.countDocuments(filter),
    ]);

    res.json({ users, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'subadmin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot change admin role' });
    user.role = role;
    await user.save();
    res.json({ user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/block
router.put('/users/:id/block', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot block admin' });

    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ user: { id: user._id, name: user.name, isBlocked: user.isBlocked } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });

    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

// ===== REVIEWS =====
// GET /api/admin/reviews
router.get('/reviews', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, approved } = req.query;
    const filter = {};
    if (approved !== undefined) filter.isApproved = approved === 'true';

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name')
        .populate('product', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.json({ reviews, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/reviews/:id/approve
router.put('/reviews/:id/approve', async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    review.isApproved = true;
    await review.save();
    res.json({ review });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const productId = review.product;
    await review.deleteOne();
    await Review.calcAverageRating(productId);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
});

// ===== COUPONS =====
// GET /api/admin/coupons
router.get('/coupons', async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/coupons
router.post('/coupons', [
  body('code').trim().notEmpty(),
  body('discountType').isIn(['percentage', 'fixed']),
  body('discountValue').isNumeric(),
  body('expiresAt').isISO8601(),
], async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ coupon });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/coupons/:id
router.delete('/coupons/:id', async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    next(error);
  }
});

// ===== CONTACTS =====
// GET /api/admin/contacts
router.get('/contacts', async (req, res, next) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }).lean();
    res.json({ contacts });
  } catch (error) {
    next(error);
  }
});

// ===== CATEGORIES =====
// GET /api/admin/categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/categories
router.post('/categories', [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('level').isIn([0, 1, 2]),
], async (req, res, next) => {
  try {
    const { name, parent, level, sortOrder } = req.body;
    const category = await Category.create({
      name,
      parent: parent || null,
      level,
      sortOrder: sortOrder || 0,
    });
    cache.clear('categories');
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/categories/:id
router.put('/categories/:id', uploadCategories.single('image'), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    if (req.body.name !== undefined) category.name = req.body.name;
    if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) category.sortOrder = req.body.sortOrder;

    // Handle image upload
    if (req.file) {
      // Remove old image from Cloudinary if exists
      if (category.image?.public_id) {
        await cloudinary.uploader.destroy(category.image.public_id);
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'rupalsha/categories',
        transformation: [{ width: 600, height: 800, crop: 'fill', quality: 'auto:good', fetch_format: 'auto' }],
      });
      category.image = { url: result.secure_url, public_id: result.public_id };
    }

    await category.save();
    cache.clear('categories');
    res.json({ category });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // Delete all descendants
    const allCats = await Category.find().lean();
    const descendantIds = getDescendantIds(allCats, category._id);
    await Category.deleteMany({ _id: { $in: [...descendantIds, category._id] } });

    cache.clear('categories');
    res.json({ message: 'Category and its subcategories deleted' });
  } catch (error) {
    next(error);
  }
});

// ===== BANNERS =====
// GET /api/admin/banners
router.get('/banners', async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json(banners);
  } catch (err) { next(err); }
});

// POST /api/admin/banners
router.post('/banners', uploadBanners.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'rupalsha/banners',
      transformation: [{ width: 1920, quality: 'auto:good', fetch_format: 'auto' }],
    });

    const count = await Banner.countDocuments();
    const banner = await Banner.create({
      image: { url: result.secure_url, public_id: result.public_id },
      title: req.body.title || '',
      link: req.body.link || '',
      order: count,
    });

    cache.clear('banners');
    res.status(201).json(banner);
  } catch (err) { next(err); }
});

// PUT /api/admin/banners/:id
router.put('/banners/:id', async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, {
      title: req.body.title,
      link: req.body.link,
      isActive: req.body.isActive,
    }, { new: true });
    cache.clear('banners');
    res.json(banner);
  } catch (err) { next(err); }
});

// PUT /api/admin/banners/reorder
router.put('/banners-reorder', async (req, res, next) => {
  try {
    const { order } = req.body; // array of banner IDs in desired order
    await Promise.all(order.map((id, i) => Banner.findByIdAndUpdate(id, { order: i })));
    cache.clear('banners');
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/admin/banners/:id
router.delete('/banners/:id', async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    if (banner.image?.public_id) {
      await cloudinary.uploader.destroy(banner.image.public_id);
    }
    await banner.deleteOne();
    cache.clear('banners');
    res.json({ success: true });
  } catch (err) { next(err); }
});

function getDescendantIds(allCategories, parentId) {
  const children = allCategories.filter(c => c.parent && c.parent.toString() === parentId.toString());
  let ids = children.map(c => c._id);
  for (const child of children) {
    ids = ids.concat(getDescendantIds(allCategories, child._id));
  }
  return ids;
}

// ===== ACTIVITY LOG =====
// GET /api/admin/activity-log
router.get('/activity-log', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.section) filter.section = req.query.section;
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /api/admin/order-metrics — in-process counters (resets on server restart)
const { orderMetrics } = require('../utils/orderMetrics');
router.get('/order-metrics', adminAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(orderMetrics.snapshot());
});

module.exports = router;
