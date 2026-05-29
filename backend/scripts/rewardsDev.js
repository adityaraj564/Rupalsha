#!/usr/bin/env node
/**
 * Dev helper for testing the post-purchase Reward (scratch-card) system.
 *
 * Usage (from backend/):
 *   node scripts/rewardsDev.js list <email>
 *   node scripts/rewardsDev.js credit-now <email>            # makes the latest pending post-purchase reward creditable in 5s
 *   node scripts/rewardsDev.js sweep                          # runs the credit sweeper once
 *   node scripts/rewardsDev.js set-loss-streak <n>            # set global anti-frustration counter (use 5 to force next loss → win)
 *   node scripts/rewardsDev.js counter                        # show global counter
 *
 * Never ship this to production unless you remove or gate it.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Reward = require('../models/Reward');
const RewardCounter = require('../models/RewardCounter');
const Order = require('../models/Order');
const { sweepPendingRewards } = require('../utils/rewardSweeper');

async function findUser(email) {
  const u = await User.findOne({ email: String(email).toLowerCase() });
  if (!u) throw new Error(`No user with email "${email}"`);
  return u;
}

async function cmdList(email) {
  const u = await findUser(email);
  const rewards = await Reward.find({ user: u._id }).sort({ createdAt: -1 }).lean();
  if (rewards.length === 0) {
    console.log(`No rewards for ${email}.`);
    return;
  }
  for (const r of rewards) {
    console.log({
      _id: r._id.toString(),
      type: r.type,
      outcome: r.outcome,
      amount: r.amount,
      creditStatus: r.creditStatus,
      creditableAt: r.creditableAt,
      order: r.order?.toString?.(),
      forcedWin: r.forcedWin,
      createdAt: r.createdAt,
    });
  }
}

async function cmdCreditNow(email) {
  const u = await findUser(email);
  const reward = await Reward.findOne({
    user: u._id,
    type: 'post_purchase',
    creditStatus: 'pending',
  }).sort({ createdAt: -1 });
  if (!reward) {
    console.log(`No pending post-purchase reward for ${email}.`);
    return;
  }
  const newDate = new Date(Date.now() - 1000);
  await Reward.updateOne({ _id: reward._id }, { $set: { creditableAt: newDate } });
  // Also force the order to "delivered" if it isn't, so the sweeper doesn't void it.
  if (reward.order) {
    await Order.updateOne(
      { _id: reward.order, status: { $nin: ['delivered', 'cancelled', 'returned', 'failed'] } },
      { $set: { status: 'delivered', deliveredAt: new Date() } }
    );
  }
  console.log(`Reward ${reward._id} is now creditable. Run "sweep" or wait for the next sweep cycle.`);
}

async function cmdSweep() {
  const result = await sweepPendingRewards();
  console.log('Sweep result:', result);
}

async function cmdSetLossStreak(nStr) {
  const n = Number(nStr);
  if (!Number.isInteger(n) || n < 0) throw new Error('Pass a non-negative integer');
  await RewardCounter.updateOne(
    { key: 'global' },
    { $set: { consecutiveLosses: n } },
    { upsert: true }
  );
  console.log(`Global loss streak set to ${n}.`);
}

async function cmdCounter() {
  const c = await RewardCounter.getGlobal();
  console.log({ consecutiveLosses: c.consecutiveLosses, updatedAt: c.updatedAt });
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.log('Usage: see header of this file');
    process.exit(0);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    switch (cmd) {
      case 'list':           await cmdList(args[0]); break;
      case 'credit-now':     await cmdCreditNow(args[0]); break;
      case 'sweep':          await cmdSweep(); break;
      case 'set-loss-streak':await cmdSetLossStreak(args[0]); break;
      case 'counter':        await cmdCounter(); break;
      default: console.log(`Unknown command: ${cmd}`); process.exit(1);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
