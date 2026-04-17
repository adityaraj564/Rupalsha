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
const upload = require('../utils/upload');
const cloudinary = require('../config/cloudinary');
const { sendOrderStatusUpdate } = require('../utils/email');

const router = express.Router();

// All routes require admin auth
router.use(adminAuth);

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
router.post('/products', upload.array('images', 5), async (req, res, next) => {
  try {
    const { name, description, price, comparePrice, category, subcategory, childCategory, categoryRef, sku, lowStockThreshold, sizes, colors, fabric, careInstructions, tags, isFeatured, isTrending, isReturnable, returnPolicy, shippingCharge } = req.body;

    const images = req.files ? req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
    })) : [];

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
      sizes: parsedSizes,
      colors: parsedColors,
      fabric,
      careInstructions,
      tags: parsedTags,
      isFeatured: isFeatured === 'true',
      isTrending: isTrending === 'true',
      isReturnable: isReturnable !== 'false',
      returnPolicy,
      shippingCharge: shippingCharge ? Number(shippingCharge) : 0,
    });

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', upload.array('images', 5), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const updateFields = ['name', 'description', 'price', 'comparePrice', 'category', 'subcategory', 'childCategory', 'categoryRef', 'sku', 'lowStockThreshold', 'fabric', 'careInstructions', 'isFeatured', 'isTrending', 'isReturnable', 'isActive', 'returnPolicy', 'shippingCharge'];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (['isFeatured', 'isTrending', 'isReturnable', 'isActive'].includes(field)) {
          product[field] = req.body[field] === 'true' || req.body[field] === true;
        } else if (['price', 'comparePrice', 'lowStockThreshold', 'shippingCharge'].includes(field)) {
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

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: file.path,
        public_id: file.filename,
      }));
      product.images = [...product.images, ...newImages];
    }

    // Remove specific images
    if (req.body.removeImages) {
      const removeIds = typeof req.body.removeImages === 'string' ? JSON.parse(req.body.removeImages) : req.body.removeImages;
      for (const publicId of removeIds) {
        await cloudinary.uploader.destroy(publicId);
      }
      product.images = product.images.filter(img => !removeIds.includes(img.public_id));
    }

    await product.save();
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

    await product.deleteOne();
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

// ===== USERS =====
// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { role: 'user' };
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
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/categories/:id
router.put('/categories/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    if (req.body.name !== undefined) category.name = req.body.name;
    if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) category.sortOrder = req.body.sortOrder;

    await category.save();
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

    res.json({ message: 'Category and its subcategories deleted' });
  } catch (error) {
    next(error);
  }
});

function getDescendantIds(allCategories, parentId) {
  const children = allCategories.filter(c => c.parent && c.parent.toString() === parentId.toString());
  let ids = children.map(c => c._id);
  for (const child of children) {
    ids = ids.concat(getDescendantIds(allCategories, child._id));
  }
  return ids;
}

module.exports = router;
