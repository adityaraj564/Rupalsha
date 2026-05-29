const mongoose = require('mongoose');

// A Spin is the canonical record of every wheel attempt. The wallet credit
// it produces (when applicable) is a separate WalletTransaction created by
// either the spin route (for instant credits) or the deferred cron worker
// (for post_purchase rewards that wait for delivery + return window).
const spinSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Which surface triggered the spin.
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
  // segment (only possible for post_purchase / comeback — welcome always wins).
  outcome: { type: String, enum: ['won', 'better_luck'], required: true },

  // Reward in INR. 0 for better_luck outcomes.
  amount: { type: Number, required: true, min: 0 },

  // True when the anti-frustration override forced this spin to win instead
  // of land on Better Luck. Useful for analytics + audit trail.
  forcedWin: { type: Boolean, default: false },

  // For post_purchase spins only. Used by the cron worker to verify the
  // order is still delivered + past the return window before crediting.
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },

  // Lifecycle of the wallet credit attached to this spin:
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

  // When the cron worker should consider crediting this spin. Set to
  // (order.deliveredAt + RETURN_WINDOW_DAYS) at the time the order is
  // marked delivered. Null until then.
  creditableAt: { type: Date, index: true },

  walletTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction' },
}, { timestamps: true });

// Prevent more than one welcome spin per user, and at most one
// post_purchase spin per order.
spinSchema.index(
  { user: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'welcome' } }
);
spinSchema.index(
  { order: 1 },
  { unique: true, partialFilterExpression: { type: 'post_purchase' } }
);

module.exports = mongoose.model('Spin', spinSchema);
