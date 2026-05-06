const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  // Desktop / wide-screen banner. Optimized to 1920x600 (landscape).
  image: {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  // Optional mobile / portrait banner. Optimized to 750x1000 (3:4 portrait).
  // When absent, the frontend falls back to `image` on small screens. Older
  // banners created before mobile support was added will simply not have it.
  mobileImage: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' },
  },
  title: { type: String, default: '' },
  link: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

bannerSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
