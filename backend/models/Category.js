const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: 100,
  },
  slug: {
    type: String,
    unique: true,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  level: {
    type: Number,
    required: true,
    enum: [0, 1, 2], // 0 = main, 1 = sub, 2 = child
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Generate slug before saving
categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Ensure unique slug
categorySchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 0;
    while (await mongoose.model('Category').findOne({ slug, _id: { $ne: this._id } })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }
    this.slug = slug;
  }
  next();
});

categorySchema.index({ parent: 1 });
categorySchema.index({ level: 1 });

module.exports = mongoose.model('Category', categorySchema);
