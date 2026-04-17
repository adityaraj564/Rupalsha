const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: 200,
  },
  slug: {
    type: String,
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: 5000,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  comparePrice: {
    type: Number,
    min: 0,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
  },
  subcategory: String,
  childCategory: String,
  categoryRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  productCode: {
    type: String,
    unique: true,
    uppercase: true,
    match: [/^[A-Z]{2}\d{2}$/, 'Product code must be 2 letters followed by 2 digits (e.g. AB12)'],
  },
  sku: {
    type: String,
    trim: true,
  },
  shippingCharge: {
    type: Number,
    default: 0,
    min: 0,
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: 0,
  },
  images: [{
    url: { type: String, required: true },
    public_id: String,
    alt: String,
  }],
  sizes: [{
    size: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'],
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  }],
  colors: [{
    name: String,
    hex: String,
  }],
  fabric: String,
  careInstructions: String,
  tags: [String],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isReturnable: {
    type: Boolean,
    default: true,
  },
  returnPolicy: {
    type: String,
    default: '7-day easy return policy. Product must be unused with original tags.',
  },
}, {
  timestamps: true,
});

// Generate slug and auto-generate unique productCode before saving
productSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  if (!this.productCode) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code;
    let exists = true;
    while (exists) {
      code = letters[Math.floor(Math.random() * 26)]
           + letters[Math.floor(Math.random() * 26)]
           + String(Math.floor(Math.random() * 10))
           + String(Math.floor(Math.random() * 10));
      exists = await mongoose.model('Product').findOne({ productCode: code });
    }
    this.productCode = code;
  }
  next();
});

// Index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ categoryRef: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ childCategory: 1 });

module.exports = mongoose.model('Product', productSchema);
