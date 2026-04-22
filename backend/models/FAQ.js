const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: 500,
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
    maxlength: 5000,
  },
  category: {
    type: String,
    enum: ['General', 'Orders', 'Shipping', 'Returns', 'Payment', 'Products'],
    default: 'General',
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

faqSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
