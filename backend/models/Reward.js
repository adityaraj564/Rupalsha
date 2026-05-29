const mongoose = require('mongoose');

// A Reward is the canonical record of every scratch-card reveal. The wallet
// credit it produces (when applicable) is a separate WalletTransaction
// created by either the reward route (for instant credits) or the deferred
// cron worker (for post_purchase rewards that wait for delivery + return
// window).
//
// Note: this model was originally called "Spin" — the underlying collection
// is still named `spins` to preserve historical data without migration.
const rewardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Which surface triggered the reward.
  //   - welcome:        fires once, right after signup
  //   - post_purchase:  fires once per paid order, credit deferred until safe
  //   - comeback:       fires when user returns after >=10 days of inactivity
  type: {
    type: String,
    enum: ['welcome', 'post_purchase', 'comeback'],
    required: true,
    index: true,
  },

  // 'won' means amount > 0. 'better_luck' means the user landed on a losing
  // outcome (only possible for post_purchase / comeback — welcome always wins).
  outcome: { type: String, enum: ['won', 'better_luck'], required: true },

  // Reward in INR. 0 for better_luck outcomes.
  amount: { type: Number, required: true, min: 0 },

  // True when the anti-frustration override forced this reward to win instead
  // of land on Better Luck. Useful for analytics + audit trail.
  forcedWin: { type: Boolean, default: false },

  // For post_purchase rewards only. Used by the cron worker to verify the
  // order is still delivered + past the return window before crediting.
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },

  // Lifecycle of the wallet credit attached to this reward:
  //   - pending:   waiting for deferred credit (post_purchase, before window closes)
  //   - credited:  WalletTransaction created and balance updated
  //   - voided:    order was cancelled / fully returned before credit; never paid out
  //   - none:      no credit needed (better_luck — no money owed)
  creditStatus: {
    type: String,
    enum: ['pending', 'credited', 'voided', 'none'],
    required: true,
    default: 'none',
  },

  // When the cron worker should consider crediting this reward. Set to
  // (order.deliveredAt + RETURN_WINDOW_DAYS) at the time the order is
  // marked delivered. Null until then.
  creditableAt: { type: Date, index: true },

  walletTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction' },
}, { timestamps: true });

// Prevent more than one welcome reward per user, and at most one
// post_purchase reward per order.
rewardSchema.index(
  { user: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'welcome' } }
);
rewardSchema.index(
  { order: 1 },
  { unique: true, partialFilterExpression: { type: 'post_purchase' } }
);

// Third arg pins the collection name so we keep reading/writing to the
// pre-rename `spins` collection — no data migration required.
module.exports = mongoose.model('Reward', rewardSchema, 'spins');
