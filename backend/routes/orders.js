const express = require('express');
const { body } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Wallet = require('../models/Wallet');
const { auth } = require('../middleware/auth');
const { sendOrderConfirmation, sendOrderCancellation, sendReturnConfirmation } = require('../utils/email');
const { applyWalletTransaction } = require('../utils/wallet');

const router = express.Router();

const FREE_SHIPPING_THRESHOLD = 999;

// POST /api/orders - Create order
router.post('/', auth, [
  body('shippingAddress').isObject(),
  body('paymentMethod').isIn(['razorpay', 'cod', 'wallet']),
], async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, couponCode } = req.body;
    const useWallet = Boolean(req.body.useWallet);        // apply wallet as partial payment
    const walletAmountRequested = Math.max(0, Math.round(Number(req.body.walletAmount) || 0));

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
    // Use the highest per-product shipping charge from the cart items
    const maxProductShipping = Math.max(...cart.items.map(item => item.product.shippingCharge || 0));
    let shippingCharge = itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : maxProductShipping;
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

    // Determine how much to pull from wallet.
    // If paymentMethod === 'wallet'  => pay the entire total from wallet (else reject).
    // Else if useWallet              => use min(balance, requested OR total) as partial, rest via razorpay/cod.
    let walletAmount = 0;
    if (paymentMethod === 'wallet' || useWallet) {
      const wallet = await Wallet.findOrCreate(req.user._id);
      if (paymentMethod === 'wallet') {
        if (wallet.balance < totalAmount) {
          return res.status(400).json({ error: `Wallet balance (₹${wallet.balance}) is less than total (₹${totalAmount}).` });
        }
        walletAmount = totalAmount;
      } else {
        const requested = walletAmountRequested > 0 ? walletAmountRequested : wallet.balance;
        walletAmount = Math.min(wallet.balance, requested, totalAmount);
      }
    }

    const remainingToPay = totalAmount - walletAmount;
    // Sanity: can't use useWallet + cod/razorpay with zero remaining unless paymentMethod is 'wallet'
    if (paymentMethod !== 'wallet' && remainingToPay === 0) {
      // Effectively a full-wallet payment even though user chose cod/razorpay
      // Treat it as paymentMethod=wallet for consistency.
    }

    const effectivePaymentMethod = remainingToPay === 0 ? 'wallet' : paymentMethod === 'wallet' ? 'wallet' : paymentMethod;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: effectivePaymentMethod,
      itemsTotal,
      shippingCharge,
      discount,
      walletAmount,
      couponCode: couponCode?.toUpperCase(),
      totalAmount,
      // Fully wallet-paid orders are immediately paid & confirmed.
      isPaid: effectivePaymentMethod === 'wallet' ? true : false,
      paidAt: effectivePaymentMethod === 'wallet' ? new Date() : undefined,
      status: effectivePaymentMethod === 'cod' || effectivePaymentMethod === 'wallet' ? 'confirmed' : 'pending',
    });

    // Debit wallet (if any amount used) — happens after order is created so we can link it.
    if (walletAmount > 0) {
      try {
        await applyWalletTransaction({
          userId: req.user._id,
          type: 'debit',
          source: 'order_payment',
          amount: walletAmount,
          description: `Payment for order ${order.orderNumber}`,
          order: order._id,
        });
      } catch (err) {
        // Rollback the order if wallet debit fails.
        await Order.deleteOne({ _id: order._id });
        return res.status(400).json({ error: err.message || 'Wallet debit failed' });
      }
    }

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
      .populate('items.product', 'slug images isReturnable');
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

    // Check if all products in the order are returnable
    const productIds = order.items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).select('isReturnable returnDays name');
    const nonReturnableItems = products.filter(p => p.isReturnable === false);
    if (nonReturnableItems.length > 0) {
      const names = nonReturnableItems.map(p => p.name).join(', ');
      return res.status(400).json({ error: `Return not available for: ${names}. These items have a no-return policy.` });
    }

    // Check return window based on per-product returnDays
    if (order.deliveredAt) {
      const daysSinceDelivery = Math.floor((Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
      const maxReturnDays = Math.max(...products.map(p => p.returnDays || 7));
      if (daysSinceDelivery > maxReturnDays) {
        return res.status(400).json({ error: `Return window has expired. The return period of ${maxReturnDays} day(s) from delivery has passed.` });
      }
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
