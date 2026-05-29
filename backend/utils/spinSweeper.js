// Background sweeper that turns post-purchase spin rewards into real wallet
// credits once their creditableAt date has passed. Runs every 5 minutes via
// a setInterval started in server.js — keeps the dependency surface zero
// (no cron lib, no BullMQ requirement). Safe to run on multiple dynos: each
// credit is gated by an atomic findOneAndUpdate that flips the spin from
// 'pending' → 'credited' before the wallet transaction is applied.

const Spin = require('../models/Spin');
const Order = require('../models/Order');
const { applyWalletTransaction } = require('./wallet');
const { createNotification } = require('./notification');

const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

async function processOne(spin) {
  // Re-check the order before paying out. If the order was cancelled,
  // returned, or failed between the spin and the credit window, void the
  // reward — the user is no longer a paying customer for this order.
  const order = await Order.findById(spin.order).select('status orderNumber');
  if (!order || ['cancelled', 'failed', 'returned'].includes(order.status)) {
    await Spin.updateOne(
      { _id: spin._id, creditStatus: 'pending' },
      { $set: { creditStatus: 'voided' } }
    );
    return { skipped: true, reason: 'order_not_eligible' };
  }

  // Claim the spin atomically. If another worker grabbed it first, bail.
  const claimed = await Spin.findOneAndUpdate(
    { _id: spin._id, creditStatus: 'pending' },
    { $set: { creditStatus: 'credited' } },
    { new: true }
  );
  if (!claimed) return { skipped: true, reason: 'already_claimed' };

  try {
    const { transaction } = await applyWalletTransaction({
      userId: spin.user,
      type: 'credit',
      source: 'spin_reward',
      amount: spin.amount,
      description: `Post-purchase spin reward for order ${order.orderNumber}`,
      order: spin.order,
    });
    await Spin.updateOne(
      { _id: spin._id },
      { $set: { walletTransaction: transaction._id } }
    );

    createNotification({
      user: spin.user,
      category: 'wallet',
      type: 'spin.credited',
      title: `₹${spin.amount} spin reward credited`,
      message: `Your post-purchase spin reward for order ${order.orderNumber} has landed in your wallet.`,
      link: '/wallet',
      meta: { orderId: spin.order, amount: spin.amount, spinId: spin._id },
    });

    return { credited: true, amount: spin.amount };
  } catch (err) {
    // Roll back the claim so the next sweep retries.
    await Spin.updateOne(
      { _id: spin._id, creditStatus: 'credited' },
      { $set: { creditStatus: 'pending' } }
    );
    throw err;
  }
}

async function sweepPendingSpins() {
  const now = new Date();
  const due = await Spin.find({
    type: 'post_purchase',
    creditStatus: 'pending',
    creditableAt: { $ne: null, $lte: now },
  }).limit(100); // cap per sweep so a backlog can't stall the loop

  if (due.length === 0) return { processed: 0, credited: 0 };

  let credited = 0;
  for (const spin of due) {
    try {
      const result = await processOne(spin);
      if (result?.credited) credited += 1;
    } catch (err) {
      console.error(`[spinSweeper] failed for spin ${spin._id}:`, err.message);
    }
  }
  return { processed: due.length, credited };
}

function startSpinSweeper() {
  // First sweep after 1 minute so server boot isn't blocked.
  setTimeout(() => {
    sweepPendingSpins().catch((e) => console.error('[spinSweeper]', e.message));
    setInterval(() => {
      sweepPendingSpins().catch((e) => console.error('[spinSweeper]', e.message));
    }, SWEEP_INTERVAL_MS);
  }, 60 * 1000).unref?.();
}

module.exports = { sweepPendingSpins, startSpinSweeper };
