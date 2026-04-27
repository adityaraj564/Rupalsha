const mongoose = require('mongoose');

/**
 * Notification model.
 *
 * Categories (keep stable — used by frontend tabs):
 *   - order      → Orders (placed, paid, shipped, delivered, returned)
 *   - wallet     → Wallet credits/debits, refund processed
 *   - offer      → Promotions, coupons, sales
 *   - alert      → Personalized: price drop, back-in-stock, recommendations
 *   - security   → New login, password change, OTP-related notices
 *   - system     → Generic / fallback
 *
 * Priority drives sort order when timestamps are close. Lower number = higher
 * priority. Order=1, Wallet=2, Security=3, Alert=4, Offer=5, System=6.
 */
const NOTIFICATION_CATEGORIES = ['order', 'wallet', 'offer', 'alert', 'security', 'system'];

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: NOTIFICATION_CATEGORIES,
    required: true,
    index: true,
  },
  // Short event type tag for finer grouping (e.g. 'order.placed', 'wallet.credit')
  type: {
    type: String,
    default: '',
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 600,
  },
  // Optional client-side route to open when notification is clicked.
  link: {
    type: String,
    default: '',
    trim: true,
  },
  // Free-form payload (orderId, productId, amount, etc.) for richer rendering.
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 9,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Compound index for the most common query: list-for-user, newest first
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, category: 1, createdAt: -1 });

// Auto-expire old read notifications after 90 days to keep collection light.
notificationSchema.index(
  { readAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90, partialFilterExpression: { read: true } }
);

notificationSchema.statics.CATEGORIES = NOTIFICATION_CATEGORIES;

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.CATEGORIES = NOTIFICATION_CATEGORIES;
