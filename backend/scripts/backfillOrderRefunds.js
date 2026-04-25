/**
 * One-time backfill: populate `refund` field on cancelled/returned orders
 * that were processed before the refund-tracker feature existed.
 *
 * Run with:
 *   node backend/scripts/backfillOrderRefunds.js
 *
 * Heuristic for paid orders without an existing refund.method:
 *   - method  = 'wallet'    (auto-refunds went to wallet historically)
 *   - status  = 'refunded'  (assume already completed if it's an old record)
 *   - amount  = totalAmount - cancellationFee
 *   - refundedAt = order.updatedAt (best available timestamp)
 *
 * For unpaid orders:
 *   - method = 'none', status = 'not_applicable'.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const Order = require('../models/Order');

(async () => {
  await connectDB();

  const candidates = await Order.find({
    status: { $in: ['cancelled', 'returned'] },
    $or: [
      { refund: { $exists: false } },
      { 'refund.method': { $in: [null, 'none'] }, 'refund.status': { $in: [null, 'not_applicable'] } },
    ],
  });

  console.log(`Found ${candidates.length} cancelled/returned orders to backfill.`);

  let walletCount = 0;
  let noneCount = 0;
  let skipCount = 0;

  for (const order of candidates) {
    // Skip if a meaningful refund record already exists (e.g. method=wallet/source already set)
    if (order.refund && order.refund.method && order.refund.method !== 'none') {
      skipCount++;
      continue;
    }

    if (order.isPaid) {
      const amount = Math.max(0, (order.totalAmount || 0) - (order.cancellationFee || 0));
      order.refund = {
        method: 'wallet',
        status: 'refunded',
        amount,
        refundedAt: order.updatedAt || new Date(),
        updatedAt: new Date(),
        notes: 'Backfilled — refund was processed before tracking was introduced',
      };
      walletCount++;
    } else {
      order.refund = {
        method: 'none',
        status: 'not_applicable',
        amount: 0,
        updatedAt: new Date(),
      };
      noneCount++;
    }

    await order.save();
    console.log(`  ✓ ${order.orderNumber} → ${order.refund.method}/${order.refund.status}`);
  }

  console.log(`\nDone. Wallet-refunded: ${walletCount}, no-refund: ${noneCount}, skipped: ${skipCount}.`);
  process.exit(0);
})().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
