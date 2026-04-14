const express = require('express');
const { body } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { auth } = require('../middleware/auth');
const { sendOrderConfirmation, sendOrderCancellation, sendReturnConfirmation } = require('../utils/email');

const router = express.Router();

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_CHARGE = 79;

// POST /api/orders - Create order
router.post('/', auth, [
  body('shippingAddress').isObject(),
  body('paymentMethod').isIn(['razorpay', 'cod']),
], async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate stock and build order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${item.product?.name || 'unknown'} is no longer available` });
      }

      const sizeInfo = product.sizes.find(s => s.size === item.size);
      if (!sizeInfo || sizeInfo.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name} (${item.size})` });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url,
        price: product.price,
        size: item.size,
        quantity: item.quantity,
      });
    }

    let itemsTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let shippingCharge = itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    let discount = 0;

    // Apply coupon
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (coupon && itemsTotal >= coupon.minOrderAmount) {
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          return res.status(400).json({ error: 'Coupon usage limit reached' });
        }

        if (coupon.discountType === 'percentage') {
          discount = Math.round(itemsTotal * coupon.discountValue / 100);
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        } else {
          discount = coupon.discountValue;
        }

        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const totalAmount = itemsTotal + shippingCharge - discount;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      itemsTotal,
      shippingCharge,
      discount,
      couponCode: couponCode?.toUpperCase(),
      totalAmount,
      isPaid: paymentMethod === 'cod' ? false : false,
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
    });

    // Reduce stock
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.product, 'sizes.size': item.size },
        { $inc: { 'sizes.$.stock': -item.quantity } }
      );
    }

    // Clear cart
    await Cart.findOneAndDelete({ user: req.user._id });

    // Send email
    sendOrderConfirmation(order, req.user.email);

    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders - User's orders
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Number(limit));

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments({ user: req.user._id }),
    ]);

    res.json({ orders, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('items.product', 'slug images');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/cancel
router.put('/:id/cancel', auth, [
  body('reason').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    order.status = 'cancelled';
    order.cancelReason = req.body.reason;
    await order.save();

    // Send cancellation email
    sendOrderCancellation(order, req.user.email, req.body.reason);

    // Restore stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, 'sizes.size': item.size },
        { $inc: { 'sizes.$.stock': item.quantity } }
      );
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/return
router.put('/:id/return', auth, [
  body('reason').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Only delivered orders can be returned' });
    }

    order.status = 'returned';
    order.returnReason = req.body.reason;
    await order.save();

    // Send return confirmation email
    sendReturnConfirmation(order, req.user.email, req.body.reason);

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
