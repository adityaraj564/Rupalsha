const mongoose = require('mongoose');

const pageContentSchema = new mongoose.Schema({
  pageKey: {
    type: String,
    required: true,
    unique: true,
    enum: ['shipping', 'returns', 'contact', 'privacy', 'terms', 'special-offer'],
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
}, {
  timestamps: true,
});

module.exports = mongoose.model('PageContent', pageContentSchema);
