const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  image: {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  title: { type: String, default: '' },
  link: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

bannerSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
