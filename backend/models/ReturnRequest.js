const mongoose = require('mongoose');

const RETURN_REASONS = [
  'wrong_item',
  'damaged',
  'missing_parts',
  'size_issue',
  'different_from_description',
];

const RETURN_STATUSES = [
  'pending',       // awaiting admin review
  'approved',      // admin approved, awaiting pickup scheduling
  'pickup_scheduled',
  'picked_up',
  'received',      // returned item received at warehouse
  'refunded',
  'rejected',
  'closed',        // cancelled by customer or admin
];

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  image: String,
  size: String,
  quantity: { type: Number, default: 1, min: 1 },
  price: Number,
}, { _id: false });

const timelineEntrySchema = new mongoose.Schema({
  status: { type: String, enum: RETURN_STATUSES, required: true },
  at: { type: Date, default: Date.now },
  note: String,
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  returnNumber: { type: String, unique: true },

  items: [returnItemSchema],

  reason: { type: String, enum: RETURN_REASONS, required: true },
  description: { type: String, maxlength: 1000 },

  // Evidence uploaded by the customer.
  images: [{
    url: { type: String, required: true },
    public_id: String,
  }],

  status: { type: String, enum: RETURN_STATUSES, default: 'pending', index: true },
  statusHistory: [timelineEntrySchema],

  // Admin-set fields after approval.
  pickupDate: Date,
  trackingNumber: String,
  courierName: String,
  adminNote: String,
  refundAmount: Number,
  refundedAt: Date,

  // Refund method chosen by customer.
  // COD orders are forced to 'wallet' on the backend.
  refundMethod: {
    type: String,
    enum: ['wallet', 'original'],
    default: 'wallet',
  },

  rejectionReason: String,
}, { timestamps: true });

returnRequestSchema.pre('save', function (next) {
  if (!this.returnNumber) {
    this.returnNumber = 'RET' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
  }
  if (this.isNew) {
    this.statusHistory = [{ status: this.status, at: new Date(), note: 'Return request submitted' }];
  }
  next();
});

returnRequestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
module.exports.RETURN_REASONS = RETURN_REASONS;
module.exports.RETURN_STATUSES = RETURN_STATUSES;
