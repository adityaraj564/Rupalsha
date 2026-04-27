const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: String,
  image: String,
  price: { type: Number, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderNumber: {
    type: String,
    unique: true,
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cod', 'wallet'],
    required: true,
  },
  paymentResult: {
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,
    status: String,
  },
  itemsTotal: { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  // Amount paid from wallet (partial or full). Razorpay/COD covers the remainder.
  walletAmount: { type: Number, default: 0, min: 0 },
  couponCode: String,
  totalAmount: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
  paidAt: Date,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'failed'],
    default: 'pending',
  },
  trackingNumber: String,
  deliveredAt: Date,
  cancelReason: String,
  cancellationFee: { type: Number, default: 0, min: 0 },
  // Refund tracking — populated after a cancellation/return.
  // method: 'wallet' (instant), 'source' (manual via Razorpay/bank), 'none' (no refund needed e.g. unpaid COD)
  // status: 'not_applicable' | 'processing' | 'refunded'
  refund: {
    method: { type: String, enum: ['wallet', 'source', 'none'], default: 'none' },
    status: { type: String, enum: ['not_applicable', 'processing', 'refunded'], default: 'not_applicable' },
    amount: { type: Number, default: 0, min: 0 },
    reference: String, // e.g. Razorpay refund id, bank UTR
    notes: String,
    refundedAt: Date,
    updatedAt: Date,
  },
  returnReason: String,
  notes: String,
  // Idempotency key (per-user) to make POST /orders safe to retry. Two
  // requests from the same user with the same key always resolve to the
  // same order — preventing duplicate orders on network retries.
  idempotencyKey: { type: String, index: true },
}, {
  timestamps: true,
});

// Generate order number before saving
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = 'RUP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
  }
  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
// Per-user uniqueness on idempotency key. `sparse` so existing orders with
// no key (legacy) don't collide.
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Order', orderSchema);
