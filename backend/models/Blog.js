const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: 300,
  },
  slug: {
    type: String,
    unique: true,
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: 500,
  },
  content: {
    type: String,
    required: [true, 'Blog content is required'],
  },
  featuredImage: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  category: {
    type: String,
    default: 'General',
    trim: true,
  },
  tags: [{ type: String, trim: true }],
  author: {
    type: String,
    default: 'Rupalsha',
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  // SEO fields
  metaTitle: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 320,
  },
  metaKeywords: {
    type: String,
    trim: true,
  },
  // Related products (optional)
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  views: {
    type: Number,
    default: 0,
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Generate slug before saving
blogSchema.pre('save', async function (next) {
  if (this.isModified('title') || !this.slug) {
    const baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 0;
    while (await mongoose.model('Blog').findOne({ slug, _id: { $ne: this._id } })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }
    this.slug = slug;
  }
  next();
});

// Set publishedAt when status changes to published
blogSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Indexes
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1 });
blogSchema.index({ isFeatured: 1 });
blogSchema.index({ title: 'text', shortDescription: 'text', tags: 'text' });

module.exports = mongoose.model('Blog', blogSchema);
