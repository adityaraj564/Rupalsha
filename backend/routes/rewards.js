const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const Reward = require('../models/Reward');
const RewardCounter = require('../models/RewardCounter');
const { createNotification } = require('../utils/notification');
const {
  REWARD_POOLS,
  RETURN_WINDOW_DAYS,
  resolveReward,
  creditableAtFor,
} = require('../utils/rewardEngine');

const router = express.Router();

// ── Public config ────────────────────────────────────────────────────
// The client reads this to know the prize ladder + rules. Weights stay
// server-side — clients only need labels + amounts.
router.get('/config', (req, res) => {
  const sanitize = (pool) => pool.map(({ label, amount }) => ({ label, amount }));
  res.json({
    post_purchase: sanitize(REWARD_POOLS.post_purchase),
    rules: {
      returnWindowDays: RETURN_WINDOW_DAYS,
    },
  });
});

// ── Eligibility ──────────────────────────────────────────────────────
// Called by the RewardController on every navigation to decide whether to
// auto-prompt the scratch card on the order success page. Only returns
// orders that haven't had their reward claimed yet.
router.get('/eligibility', auth, async (req, res, next) => {
  try {
    // Orders that have been paid (or are COD) and haven't had a post-purchase
    // reward yet. We don't gate on delivery — dopamine immediately, credit
    // deferred. Cancelled / failed orders are excluded.
    const eligibleOrders = await Order.find({
      user: req.user._id,
      status: { $in: ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] },
    }).select('_id orderNumber createdAt status').sort({ createdAt: -1 }).lean();

    const orderIds = eligibleOrders.map((o) => o._id);
    const claimedOrderIds = await Reward.find({
      type: 'post_purchase',
      order: { $in: orderIds },
    }).distinct('order');
    const claimedSet = new Set(claimedOrderIds.map((id) => String(id)));

    const pendingPostPurchase = eligibleOrders
      .filter((o) => !claimedSet.has(String(o._id)))
      .map((o) => ({ orderId: o._id, orderNumber: o.orderNumber }));

    res.json({
      postPurchase: pendingPostPurchase,
    });
  } catch (err) {
    next(err);
  }
});

// ── History ──────────────────────────────────────────────────────────
// Powers the /rewards page. Returns the user's past rewards plus the same
// eligibility info so the page can render "pending" cards (which open the
// scratch modal) alongside the timeline of past wins / losses.
router.get('/history', auth, async (req, res, next) => {
  try {
    const rewards = await Reward.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('order', 'orderNumber status deliveredAt')
      .lean();
    res.json({
      rewards: rewards.map((r) => ({
        _id: r._id,
        type: r.type,
        outcome: r.outcome,
        amount: r.amount,
        creditStatus: r.creditStatus,
        creditableAt: r.creditableAt,
        order: r.order
          ? { _id: r.order._id, orderNumber: r.order.orderNumber, status: r.order.status }
          : null,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Dashboard (single round-trip) ────────────────────────────────────
// The /rewards page used to fan out three separate requests (config +
// eligibility + history). Each one added latency on slow networks and the
// page felt sluggish. This bundled endpoint runs the underlying queries
// in parallel and returns one payload, cutting wall-clock time roughly in
// half on mobile.
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const orderQuery = Order.find({
      user: req.user._id,
      status: { $in: ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] },
    }).select('_id orderNumber createdAt status').sort({ createdAt: -1 }).lean();

    const historyQuery = Reward.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('order', 'orderNumber status deliveredAt')
      .lean();

    const [eligibleOrders, rewards] = await Promise.all([orderQuery, historyQuery]);

    const orderIds = eligibleOrders.map((o) => o._id);
    const claimedOrderIds = orderIds.length
      ? await Reward.find({ type: 'post_purchase', order: { $in: orderIds } }).distinct('order')
      : [];
    const claimedSet = new Set(claimedOrderIds.map((id) => String(id)));

    const pendingPostPurchase = eligibleOrders
      .filter((o) => !claimedSet.has(String(o._id)))
      .map((o) => ({ orderId: o._id, orderNumber: o.orderNumber }));

    res.json({
      config: {
        post_purchase: REWARD_POOLS.post_purchase.map(({ label, amount }) => ({ label, amount })),
        rules: { returnWindowDays: RETURN_WINDOW_DAYS },
      },
      eligibility: { postPurchase: pendingPostPurchase },
      history: rewards.map((r) => ({
        _id: r._id,
        type: r.type,
        outcome: r.outcome,
        amount: r.amount,
        creditStatus: r.creditStatus,
        creditableAt: r.creditableAt,
        order: r.order
          ? { _id: r.order._id, orderNumber: r.order.orderNumber, status: r.order.status }
          : null,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────

// Atomic increment / reset of the global loss-streak counter. Called after
// every reward so the next caller sees the updated state.
async function updateLossCounter(outcome) {
  if (outcome === 'won') {
    await RewardCounter.updateOne({ key: 'global' }, { $set: { consecutiveLosses: 0 } });
  } else {
    await RewardCounter.updateOne({ key: 'global' }, { $inc: { consecutiveLosses: 1 } });
  }
}

// ── Post-purchase reward ─────────────────────────────────────────────
// Immediate dopamine, deferred credit. We record the win at reveal time but
// only mark the wallet transaction once the order is delivered AND the
// return window has passed. The cron worker handles the actual credit. If
// the order is cancelled / fully returned before then, the credit is voided
// automatically.
router.post('/post-purchase/:orderId', auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Block claiming on cancelled / failed / returned orders to prevent abuse.
    if (['cancelled', 'failed', 'returned'].includes(order.status)) {
      return res.status(409).json({ error: 'This order is not eligible for a reward' });
    }

    const existing = await Reward.findOne({ type: 'post_purchase', order: order._id });
    if (existing) {
      return res.status(409).json({ error: 'You have already claimed a reward for this order' });
    }

    const counter = await RewardCounter.getGlobal();
    const { index, entry, forcedWin } = resolveReward('post_purchase', counter);
    const outcome = entry.amount > 0 ? 'won' : 'better_luck';

    let creditStatus = 'none';
    let creditableAt = null;
    if (outcome === 'won') {
      if (order.status === 'delivered' && order.deliveredAt) {
        // Already delivered — schedule credit at deliveredAt + return window.
        creditStatus = 'pending';
        creditableAt = creditableAtFor(order.deliveredAt);
      } else {
        // Not delivered yet. The delivery status route will set creditableAt
        // when it flips status → 'delivered'.
        creditStatus = 'pending';
      }
    }

    const reward = await Reward.create({
      user: req.user._id,
      type: 'post_purchase',
      outcome,
      amount: entry.amount,
      forcedWin,
      order: order._id,
      creditStatus,
      creditableAt,
    });

    await updateLossCounter(outcome);

    // Notification so the user remembers their pending reward even if they
    // close the modal mid-reveal.
    if (outcome === 'won') {
      createNotification({
        user: req.user._id,
        category: 'wallet',
        type: 'reward.pending',
        title: `You won ₹${entry.amount}!`,
        message: `₹${entry.amount} will be credited to your wallet after order ${order.orderNumber} is delivered and the return window closes.`,
        link: '/wallet',
        meta: { orderId: order._id, amount: entry.amount, rewardId: reward._id },
      });
    }

    res.json({
      reward: { _id: reward._id, type: 'post_purchase', amount: reward.amount, outcome: reward.outcome, creditStatus },
      segment: { label: entry.label, amount: entry.amount, index },
      message: outcome === 'won'
        ? `₹${entry.amount} will land in your wallet after delivery + ${RETURN_WINDOW_DAYS} days.`
        : 'Better luck next time!',
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'You have already claimed a reward for this order' });
    }
    next(err);
  }
});

module.exports = router;
