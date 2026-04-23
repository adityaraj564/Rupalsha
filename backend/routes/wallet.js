const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const { applyWalletTransaction } = require('../utils/wallet');

const router = express.Router();

const MIN_RECHARGE = 100;
const MAX_RECHARGE = 50000;

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const err = new Error('Payment gateway is not configured.');
    err.statusCode = 503;
    throw err;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ---------- USER ROUTES ----------

// GET /api/wallet — current balance + recent transactions
router.get('/', auth, async (req, res, next) => {
  try {
    const wallet = await Wallet.findOrCreate(req.user._id);
    const transactions = await WalletTransaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ balance: wallet.balance, transactions });
  } catch (err) {
    next(err);
  }
});

// GET /api/wallet/transactions — paginated transaction history
router.get('/transactions', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));
    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      WalletTransaction.countDocuments({ user: req.user._id }),
    ]);
    res.json({ transactions, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/recharge/create — create a Razorpay order for recharging
router.post('/recharge/create', auth, async (req, res, next) => {
  try {
    const amount = Math.round(Number(req.body.amount));
    if (!amount || amount < MIN_RECHARGE || amount > MAX_RECHARGE) {
      return res.status(400).json({ error: `Amount must be between ₹${MIN_RECHARGE} and ₹${MAX_RECHARGE}` });
    }

    const razorpay = getRazorpayInstance();
    const receipt = `WLT${Date.now().toString(36).toUpperCase()}`;
    const rzpOrder = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: 'INR',
      receipt,
      notes: { type: 'wallet_recharge', userId: String(req.user._id) },
    });

    // Log a pending transaction for traceability (no balance change yet)
    const { transaction } = await applyWalletTransaction({
      userId: req.user._id,
      type: 'credit',
      source: 'recharge',
      amount,
      description: 'Wallet recharge initiated',
      razorpay: { orderId: rzpOrder.id },
      status: 'pending',
    });

    res.json({
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      transactionId: transaction._id,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/recharge/verify — verify payment and credit wallet
router.post('/recharge/verify', auth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Find the pending transaction we created at /create
    const pending = await WalletTransaction.findOne({
      _id: transactionId,
      user: req.user._id,
      status: 'pending',
      'razorpay.orderId': razorpay_order_id,
    });

    if (!pending) {
      return res.status(404).json({ error: 'Recharge transaction not found or already processed' });
    }

    // Credit the wallet with a new completed transaction linking to the razorpay details
    const { wallet, transaction } = await applyWalletTransaction({
      userId: req.user._id,
      type: 'credit',
      source: 'recharge',
      amount: pending.amount,
      description: 'Wallet recharge',
      razorpay: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
      status: 'completed',
    });

    pending.status = 'failed';
    pending.description = 'Superseded by completed recharge';
    await pending.save();

    res.json({
      balance: wallet.balance,
      transaction,
      message: 'Wallet recharged successfully',
    });
  } catch (err) {
    next(err);
  }
});

// ---------- ADMIN ROUTES ----------

// GET /api/wallet/admin/user/:userId — balance + transactions for any user
router.get('/admin/user/:userId', adminAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('name email phone');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const wallet = await Wallet.findOrCreate(user._id);
    const transactions = await WalletTransaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ user, balance: wallet.balance, transactions });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/admin/adjust — manual credit/debit by admin
router.post('/admin/adjust', adminAuth, async (req, res, next) => {
  try {
    const { userId, type, amount, description } = req.body;
    if (!userId || !['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'userId and valid type are required' });
    }
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) {
      return res.status(400).json({ error: 'amount must be positive' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { wallet, transaction } = await applyWalletTransaction({
      userId,
      type,
      source: type === 'credit' ? 'admin_credit' : 'admin_debit',
      amount: amt,
      description: description || `Manual ${type} by admin`,
      performedBy: req.user._id,
      status: 'completed',
    });

    res.json({ balance: wallet.balance, transaction });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
