const mongoose = require('mongoose');

const featureItemSchema = new mongoose.Schema({
  icon: { type: String, default: 'FiTruck' },
  title: { type: String, default: '' },
  desc: { type: String, default: '' },
}, { _id: false });

const pageContentSchema = new mongoose.Schema({
  pageKey: {
    type: String,
    required: true,
    unique: true,
    enum: ['shipping', 'returns', 'contact', 'privacy', 'terms', 'special-offer', 'home-hero', 'home-features', 'home-marquee', 'footer-about'],
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  contactEmail: String,
  contactPhone: String,
  supportHours: String,
  offerHeading: String,
  offerCode: String,
  offerDescription: String,
  offerLink: String,
  offerImage: String,
  // Optional mobile-only background for the special-offer banner.
  // When set, the home page renders it via a <picture> source query
  // so phones get a portrait image fitted to a tall mobile slot
  // instead of a desktop landscape image cropped to a strip.
  offerImageMobile: String,
  // Home hero
  heroEyebrow: String,
  heroTitle: String,
  heroAccent: String,
  // Home features list
  features: { type: [featureItemSchema], default: undefined },
  // Footer brand block
  brandName: String,
}, {
  timestamps: true,
});

module.exports = mongoose.model('PageContent', pageContentSchema);
