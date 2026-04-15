const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

const router = express.Router();

const PAYMENT_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const err = new Error('Payment gateway is not configured. Please contact support.');
    err.statusCode = 503;
    throw err;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// Helper: expire old pending online-payment orders
const expirePendingOrders = async () => {
  const cutoff = new Date(Date.now() - PAYMENT_EXPIRY_MS);
  const expiredOrders = await Order.find({
    status: 'pending',
    paymentMethod: 'razorpay',
    isPaid: false,
    createdAt: { $lt: cutoff },
  });

  for (const order of expiredOrders) {
    order.status = 'failed';
    await order.save();
    // Restore stock for failed orders
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, 'sizes.size': item.size },
        { $inc: { 'sizes.$.stock': item.quantity } }
      );
    }
  }
};

// POST /api/payment/create-order
router.post('/create-order', auth, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.isPaid) return res.status(400).json({ error: 'Order already paid' });
    if (order.status === 'failed') return res.status(400).json({ error: 'Order has expired. Please place a new order.' });

    // Check if order is older than 1 hour
    if (Date.now() - new Date(order.createdAt).getTime() > PAYMENT_EXPIRY_MS) {
      order.status = 'failed';
      await order.save();
      // Restore stock
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product, 'sizes.size': item.size },
          { $inc: { 'sizes.$.stock': item.quantity } }
        );
      }
      return res.status(400).json({ error: 'Order has expired. Please place a new order.' });
    }

    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // amount in paise
      currency: 'INR',
      receipt: order.orderNumber,
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/verify
router.post('/verify', auth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.isPaid = true;
    order.paidAt = new Date();
    order.status = 'confirmed';
    order.paymentResult = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: 'completed',
    };
    await order.save();

    res.json({ message: 'Payment verified successfully', order });
  } catch (error) {
    next(error);
  }
});

// Run expiry check periodically (every 10 minutes)
setInterval(expirePendingOrders, 10 * 60 * 1000);
// Also run once on startup after a short delay
setTimeout(expirePendingOrders, 5000);

module.exports = router;
