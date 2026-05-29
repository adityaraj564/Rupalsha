// Background sweeper that turns post-purchase rewards into real wallet
// credits once their creditableAt date has passed. Runs every 5 minutes via
// a setInterval started in server.js — keeps the dependency surface zero
// (no cron lib, no BullMQ requirement). Safe to run on multiple dynos: each
// credit is gated by an atomic findOneAndUpdate that flips the reward from
// 'pending' → 'credited' before the wallet transaction is applied.

const Reward = require('../models/Reward');
const Order = require('../models/Order');
const { applyWalletTransaction } = require('./wallet');
const { createNotification } = require('./notification');

const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

async function processOne(reward) {
  // Re-check the order before paying out. If the order was cancelled,
  // returned, or failed between the reward and the credit window, void the
  // payout — the user is no longer a paying customer for this order.
  const order = await Order.findById(reward.order).select('status orderNumber');
  if (!order || ['cancelled', 'failed', 'returned'].includes(order.status)) {
    await Reward.updateOne(
      { _id: reward._id, creditStatus: 'pending' },
      { $set: { creditStatus: 'voided' } }
    );
    return { skipped: true, reason: 'order_not_eligible' };
  }

  // Claim the reward atomically. If another worker grabbed it first, bail.
  const claimed = await Reward.findOneAndUpdate(
    { _id: reward._id, creditStatus: 'pending' },
    { $set: { creditStatus: 'credited' } },
    { new: true }
  );
  if (!claimed) return { skipped: true, reason: 'already_claimed' };

  try {
    const { transaction } = await applyWalletTransaction({
      userId: reward.user,
      // Wallet transaction `source` enum value stays 'spin_reward' for
      // historical-data compatibility — existing rows in production already
      // use this string and changing it would break wallet history queries.
      type: 'credit',
      source: 'spin_reward',
      amount: reward.amount,
      description: `Post-purchase reward for order ${order.orderNumber}`,
      order: reward.order,
    });
    await Reward.updateOne(
      { _id: reward._id },
      { $set: { walletTransaction: transaction._id } }
    );

    createNotification({
      user: reward.user,
      category: 'wallet',
      type: 'reward.credited',
      title: `₹${reward.amount} reward credited`,
      message: `Your post-purchase reward for order ${order.orderNumber} has landed in your wallet.`,
      link: '/wallet',
      meta: { orderId: reward.order, amount: reward.amount, rewardId: reward._id },
    });

    return { credited: true, amount: reward.amount };
  } catch (err) {
    // Roll back the claim so the next sweep retries.
    await Reward.updateOne(
      { _id: reward._id, creditStatus: 'credited' },
      { $set: { creditStatus: 'pending' } }
    );
    throw err;
  }
}

async function sweepPendingRewards() {
  const now = new Date();
  const due = await Reward.find({
    type: 'post_purchase',
    creditStatus: 'pending',
    creditableAt: { $ne: null, $lte: now },
  }).limit(100); // cap per sweep so a backlog can't stall the loop

  if (due.length === 0) return { processed: 0, credited: 0 };

  let credited = 0;
  for (const reward of due) {
    try {
      const result = await processOne(reward);
      if (result?.credited) credited += 1;
    } catch (err) {
      console.error(`[rewardSweeper] failed for reward ${reward._id}:`, err.message);
    }
  }
  return { processed: due.length, credited };
}

function startRewardSweeper() {
  // First sweep after 1 minute so server boot isn't blocked.
  setTimeout(() => {
    sweepPendingRewards().catch((e) => console.error('[rewardSweeper]', e.message));
    setInterval(() => {
      sweepPendingRewards().catch((e) => console.error('[rewardSweeper]', e.message));
    }, SWEEP_INTERVAL_MS);
  }, 60 * 1000).unref?.();
}

module.exports = { sweepPendingRewards, startRewardSweeper };
