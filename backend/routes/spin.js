const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Spin = require('../models/Spin');
const SpinCounter = require('../models/SpinCounter');
const { applyWalletTransaction } = require('../utils/wallet');
const { createNotification } = require('../utils/notification');
const {
  WHEELS,
  RETURN_WINDOW_DAYS,
  COMEBACK_INACTIVE_DAYS,
  resolveSpin,
  creditableAtFor,
  isComebackEligible,
} = require('../utils/spinEngine');

const router = express.Router();

// ── Public config ────────────────────────────────────────────────────
// The client renders the wheel from this config so the visual order of
// segments always matches the server-side weight table. Weights are NOT
// exposed — clients only need labels + amounts to draw slices.
router.get('/config', (req, res) => {
  const sanitize = (wheel) => wheel.map(({ label, amount }) => ({ label, amount }));
  res.json({
    welcome: sanitize(WHEELS.welcome),
    post_purchase: sanitize(WHEELS.post_purchase),
    comeback: sanitize(WHEELS.comeback),
    rules: {
      returnWindowDays: RETURN_WINDOW_DAYS,
      comebackInactiveDays: COMEBACK_INACTIVE_DAYS,
    },
  });
});

// ── Eligibility ──────────────────────────────────────────────────────
// Single call the client makes on app boot (after login) to decide which
// spin modal to show, if any. Priority on the client: welcome → post_purchase → comeback.
router.get('/eligibility', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('welcomeSpinAt lastSpinAt');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Orders that have been paid (or are COD) and haven't had a post-purchase
    // spin yet. We don't gate on delivery — Option A: dopamine immediately,
    // credit deferred. Cancelled / failed orders are excluded.
    const eligibleOrders = await Order.find({
      user: user._id,
      status: { $in: ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] },
    }).select('_id orderNumber createdAt status').sort({ createdAt: -1 }).lean();

    const orderIds = eligibleOrders.map((o) => o._id);
    const spunOrderIds = await Spin.find({
      type: 'post_purchase',
      order: { $in: orderIds },
    }).distinct('order');
    const spunSet = new Set(spunOrderIds.map((id) => String(id)));

    const pendingPostPurchase = eligibleOrders
      .filter((o) => !spunSet.has(String(o._id)))
      .map((o) => ({ orderId: o._id, orderNumber: o.orderNumber }));

    res.json({
      welcome: !user.welcomeSpinAt,
      postPurchase: pendingPostPurchase,
      comeback: isComebackEligible(user),
    });
  } catch (err) {
    next(err);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────

// Atomic increment / reset of the global loss-streak counter. Called after
// every spin so the next caller sees the updated state.
async function updateLossCounter(outcome) {
  if (outcome === 'won') {
    await SpinCounter.updateOne({ key: 'global' }, { $set: { consecutiveLosses: 0 } });
  } else {
    await SpinCounter.updateOne({ key: 'global' }, { $inc: { consecutiveLosses: 1 } });
  }
}

// Run the engine, persist the Spin doc, update the user's lastSpinAt, bump
// the loss counter, and (optionally) credit the wallet immediately. Used
// for welcome + comeback spins.
async function executeImmediateSpin({ user, type }) {
  const counter = await SpinCounter.getGlobal();
  const { index, segment, forcedWin } = resolveSpin(type, counter);
  const outcome = segment.amount > 0 ? 'won' : 'better_luck';

  let walletTransaction;
  if (outcome === 'won') {
    const { transaction } = await applyWalletTransaction({
      userId: user._id,
      type: 'credit',
      source: 'spin_reward',
      amount: segment.amount,
      description: `${type === 'welcome' ? 'Welcome' : 'Comeback'} spin reward`,
    });
    walletTransaction = transaction._id;
  }

  const spin = await Spin.create({
    user: user._id,
    type,
    outcome,
    amount: segment.amount,
    forcedWin,
    creditStatus: outcome === 'won' ? 'credited' : 'none',
    walletTransaction,
  });

  // Stamp user state so eligibility checks stay cheap.
  const userPatch = { lastSpinAt: new Date() };
  if (type === 'welcome') userPatch.welcomeSpinAt = new Date();
  await User.updateOne({ _id: user._id }, { $set: userPatch });

  await updateLossCounter(outcome);

  return { spin, segment, index, forcedWin };
}

// ── Welcome spin ─────────────────────────────────────────────────────
router.post('/welcome', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('welcomeSpinAt lastSpinAt');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.welcomeSpinAt) {
      return res.status(409).json({ error: 'Welcome spin already used' });
    }

    const { spin, segment, index } = await executeImmediateSpin({ user, type: 'welcome' });
    res.json({
      spin: { _id: spin._id, type: 'welcome', amount: spin.amount, outcome: spin.outcome },
      segment: { label: segment.label, amount: segment.amount, index },
    });
  } catch (err) {
    // Unique index on (user, type=welcome) protects against double-tap races.
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Welcome spin already used' });
    }
    next(err);
  }
});

// ── Comeback spin ────────────────────────────────────────────────────
router.post('/comeback', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('welcomeSpinAt lastSpinAt');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!isComebackEligible(user)) {
      return res.status(409).json({ error: 'Comeback spin not available yet' });
    }

    const { spin, segment, index } = await executeImmediateSpin({ user, type: 'comeback' });
    res.json({
      spin: { _id: spin._id, type: 'comeback', amount: spin.amount, outcome: spin.outcome },
      segment: { label: segment.label, amount: segment.amount, index },
    });
  } catch (err) {
    next(err);
  }
});

// ── Post-purchase spin ───────────────────────────────────────────────
// User chose Option A: immediate dopamine, deferred credit. We record the
// win at spin time but only mark the wallet transaction once the order is
// delivered AND the return window has passed. The cron worker handles the
// actual credit. If the order is cancelled / fully returned before then,
// the credit is voided automatically by the cancellation / return route.
router.post('/post-purchase/:orderId', auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Block spinning on cancelled / failed / returned orders to prevent abuse.
    if (['cancelled', 'failed', 'returned'].includes(order.status)) {
      return res.status(409).json({ error: 'This order is not eligible for a spin' });
    }

    const existing = await Spin.findOne({ type: 'post_purchase', order: order._id });
    if (existing) {
      return res.status(409).json({ error: 'You have already spun for this order' });
    }

    const counter = await SpinCounter.getGlobal();
    const { index, segment, forcedWin } = resolveSpin('post_purchase', counter);
    const outcome = segment.amount > 0 ? 'won' : 'better_luck';

    let creditStatus = 'none';
    let creditableAt = null;
    if (outcome === 'won') {
      if (order.status === 'delivered' && order.deliveredAt) {
        // Already delivered (rare for instant spin, but possible if the
        // client triggers the spin after the order is delivered). Schedule
        // the credit at deliveredAt + return window.
        creditStatus = 'pending';
        creditableAt = creditableAtFor(order.deliveredAt);
      } else {
        // Not delivered yet. The delivery status route will set creditableAt
        // when it flips status → 'delivered'.
        creditStatus = 'pending';
      }
    }

    const spin = await Spin.create({
      user: req.user._id,
      type: 'post_purchase',
      outcome,
      amount: segment.amount,
      forcedWin,
      order: order._id,
      creditStatus,
      creditableAt,
    });

    await User.updateOne({ _id: req.user._id }, { $set: { lastSpinAt: new Date() } });
    await updateLossCounter(outcome);

    // Surface a notification so the user remembers their pending reward even
    // if they close the modal mid-spin.
    if (outcome === 'won') {
      createNotification({
        user: req.user._id,
        category: 'wallet',
        type: 'spin.pending',
        title: `You won ₹${segment.amount}!`,
        message: `₹${segment.amount} will be credited to your wallet after order ${order.orderNumber} is delivered and the return window closes.`,
        link: '/wallet',
        meta: { orderId: order._id, amount: segment.amount, spinId: spin._id },
      });
    }

    res.json({
      spin: { _id: spin._id, type: 'post_purchase', amount: spin.amount, outcome: spin.outcome, creditStatus },
      segment: { label: segment.label, amount: segment.amount, index },
      message: outcome === 'won'
        ? `₹${segment.amount} will land in your wallet after delivery + ${RETURN_WINDOW_DAYS} days.`
        : 'Better luck next time!',
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'You have already spun for this order' });
    }
    next(err);
  }
});

module.exports = router;
