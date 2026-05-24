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
    maxlength: [1500, 'Description cannot exceed 1500 characters'],
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
  // Internal cost / actual purchase price — admin only, never exposed publicly
  actualPrice: {
    type: Number,
    min: 0,
    default: 0,
    select: false,
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
  // Admin-only internal code (matches the code maintained in the owner's pricing
  // Excel sheet). Never exposed on customer-facing endpoints — guarded by
  // `select: false`; admin routes explicitly `+rupalshaCode`.
  // Letters-only (A-Z). Empty/unset is allowed; if set, must contain no
  // digits or symbols so it can be cleanly matched against the owner's
  // Excel sheet during inventory import.
  rupalshaCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 50,
    select: false,
    validate: {
      validator: (v) => !v || /^[A-Z]+$/.test(v),
      message: 'R Code must contain only letters (A-Z), no digits or symbols.',
    },
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
  videos: [{
    url: { type: String, required: true },
    public_id: String,
    thumbnail: String,
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
  returnDays: {
    type: Number,
    default: 2,
    min: 0,
  },
  returnPolicy: {
    type: String,
    default: 'Easy return policy. Product must be unused with original tags. Please upload clear photos of the issue when raising a return request.',
  },
  highlights: [{
    key: { type: String, trim: true },
    value: { type: String, trim: true },
  }],
  specifications: [{
    group: { type: String, trim: true },
    fields: [{
      key: { type: String, trim: true },
      value: { type: String, trim: true },
    }],
  }],
  // ---- Social proof / scarcity counters --------------------------------
  // Lifetime page-view counter for this product (real visits only — the
  // bump endpoint is rate-limited per-session on the client and ignores
  // SSR/bot traffic). Persisted purely so we can show genuine "X viewed
  // this today" social-proof copy on the storefront.
  totalViews: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Rolling per-day view counter. `date` is a UTC YYYY-MM-DD string; the
  // backend resets `count` to 1 the first time the date rolls over so we
  // never display stale "today" numbers from previous days.
  dailyViews: {
    date: { type: String, default: '' },
    count: { type: Number, default: 0, min: 0 },
  },
  // Lifetime units sold — incremented atomically inside the same
  // findOneAndUpdate that decrements stock during order placement, so it
  // can never drift from real orders.
  salesCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Rolling per-ISO-week sales counter. `week` is an ISO week key
  // (YYYY-Www); the counter is reset when the current week changes.
  weeklySales: {
    week: { type: String, default: '' },
    count: { type: Number, default: 0, min: 0 },
  },
}, {
  timestamps: true,
});

// ----- GOLDMASTER cipher --------------------------------------------------
// The owner maintains internal cost prices encoded as letters using a
// fixed substitution cipher (G=1, O=2, L=3, D=4, M=5, A=6, S=7, T=8,
// E=9, R=0). The rupalshaCode field on every product is the encoded cost
// — so we can derive the real numeric "actual price" purely from the
// code. Examples: GSM -> 175, SR -> 70, GLD -> 134, TER -> 890.
//
// Exposed as a static so admin routes/UI helpers can reuse the same
// mapping (e.g. to back-fill stored actualPrice for products that were
// created before this cipher existed).
const GOLDMASTER_MAP = {
  G: 1, O: 2, L: 3, D: 4, M: 5, A: 6, S: 7, T: 8, E: 9, R: 0,
};
function computeActualPriceFromRCode(code) {
  if (!code) return 0;
  const cleaned = String(code).trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleaned) return 0;
  let digits = '';
  for (const ch of cleaned) {
    if (!(ch in GOLDMASTER_MAP)) return 0; // unknown letter — refuse to guess
    digits += String(GOLDMASTER_MAP[ch]);
  }
  const num = Number(digits);
  return Number.isFinite(num) ? num : 0;
}

// Generate slug and auto-generate unique productCode before saving
productSchema.pre('save', async function (next) {
  // Only generate a slug on creation. Regenerating it on every name edit
  // would break any URL already opened in another tab/device (the next
  // refresh would 404), and would also kill SEO/share links. The admin
  // can still change the displayed name freely — the slug stays put.
  if (this.isNew && !this.slug) {
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
  // Derive actualPrice from rupalshaCode whenever the R-code is set so
  // the admin never has to maintain the cost price in two places. Old
  // imported prices are overwritten on save — the cipher is the single
  // source of truth going forward.
  if (this.rupalshaCode) {
    this.actualPrice = computeActualPriceFromRCode(this.rupalshaCode);
  } else if (this.isModified('rupalshaCode')) {
    // Code was cleared on this save — reset the derived price too.
    this.actualPrice = 0;
  }
  next();
});

productSchema.statics.computeActualPriceFromRCode = computeActualPriceFromRCode;

// Index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ categoryRef: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ childCategory: 1 });
// Performance indexes for common queries
productSchema.index({ isActive: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isTrending: 1, createdAt: -1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ slug: 1 });

module.exports = mongoose.model('Product', productSchema);
