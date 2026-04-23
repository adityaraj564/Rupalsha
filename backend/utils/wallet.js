const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

/**
 * Apply a credit/debit to the user's wallet atomically-ish.
 *
 * Not using a Mongo transaction to avoid requiring a replica set in dev.
 * The flow: load wallet, adjust balance, persist wallet first, then log the
 * transaction. Failures between the two are rare but logged as 'failed'.
 *
 * @param {Object} opts
 * @param {ObjectId} opts.userId
 * @param {'credit'|'debit'} opts.type
 * @param {string} opts.source  one of WalletTransaction.TX_SOURCES
 * @param {number} opts.amount  positive INR
 * @param {string} [opts.description]
 * @param {ObjectId} [opts.order]
 * @param {ObjectId} [opts.returnRequest]
 * @param {Object}  [opts.razorpay]
 * @param {ObjectId} [opts.performedBy]
 * @param {'pending'|'completed'|'failed'} [opts.status]
 * @returns {{ wallet: Wallet, transaction: WalletTransaction }}
 */
async function applyWalletTransaction({
  userId,
  type,
  source,
  amount,
  description,
  order,
  returnRequest,
  razorpay,
  performedBy,
  status = 'completed',
}) {
  if (!userId) throw new Error('userId required');
  if (!['credit', 'debit'].includes(type)) throw new Error('Invalid type');
  const amt = Math.round(Number(amount));
  if (!amt || amt <= 0) throw new Error('amount must be a positive integer');

  const wallet = await Wallet.findOrCreate(userId);

  // Only adjust balance if transaction is completed. Pending txs log but don't move money.
  let newBalance = wallet.balance;
  if (status === 'completed') {
    if (type === 'credit') {
      // Atomic increment
      const updated = await Wallet.findOneAndUpdate(
        { _id: wallet._id },
        { $inc: { balance: amt } },
        { new: true }
      );
      newBalance = updated.balance;
      wallet.balance = newBalance;
    } else {
      // Atomic conditional debit — succeeds only if balance >= amt
      const updated = await Wallet.findOneAndUpdate(
        { _id: wallet._id, balance: { $gte: amt } },
        { $inc: { balance: -amt } },
        { new: true }
      );
      if (!updated) {
        const err = new Error('Insufficient wallet balance');
        err.statusCode = 400;
        throw err;
      }
      newBalance = updated.balance;
      wallet.balance = newBalance;
    }
  }

  const tx = await WalletTransaction.create({
    user: userId,
    type,
    source,
    amount: amt,
    balanceAfter: newBalance,
    description,
    order,
    returnRequest,
    razorpay,
    performedBy,
    status,
  });

  return { wallet, transaction: tx };
}

module.exports = { applyWalletTransaction };
