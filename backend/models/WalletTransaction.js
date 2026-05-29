const mongoose = require('mongoose');

const TX_TYPES = ['credit', 'debit'];
const TX_SOURCES = [
  'recharge',          // user recharged via online payment
  'refund',            // refund credited from a return
  'order_payment',     // wallet used to pay for an order
  'order_refund',      // reversal when an order is cancelled
  'admin_credit',      // manual admin credit
  'admin_debit',       // manual admin debit / adjustment
  'spin_reward',       // loyalty spin payout (welcome / post-purchase / comeback)
];

const walletTxSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: TX_TYPES, required: true },
  source: { type: String, enum: TX_SOURCES, required: true },
  amount: { type: Number, required: true, min: 0 }, // always positive; `type` decides sign

  // Balance after applying this transaction — useful for statements
  balanceAfter: { type: Number, required: true },

  description: { type: String, maxlength: 500 },

  // Loose references for traceability
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ReturnRequest' },

  // Razorpay fields when source = 'recharge'
  razorpay: {
    orderId: String,
    paymentId: String,
    signature: String,
  },

  // Status lifecycle for recharges: pending -> completed / failed
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed', index: true },

  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

walletTxSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTxSchema);
module.exports.TX_TYPES = TX_TYPES;
module.exports.TX_SOURCES = TX_SOURCES;
