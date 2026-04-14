const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');

const router = express.Router();

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// POST /api/payment/create-order
router.post('/create-order', auth, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.isPaid) return res.status(400).json({ error: 'Order already paid' });

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

module.exports = router;
