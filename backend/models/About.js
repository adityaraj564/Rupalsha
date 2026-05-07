const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  title: { type: String }, // e.g. "Founder & CDO", "Co-Founder & CEO"
  bio: { type: String },
  image: {
    url: String,
    public_id: String,
  },
});

// A single "promise" / value chip rendered as an icon + short label
// on the public About page. The icon is stored as a string key
// (e.g. "award", "truck") that the frontend maps to a real icon
// component, so the admin never has to deal with React imports.
const promiseSchema = new mongoose.Schema({
  icon: { type: String, default: 'award' },
  label: { type: String, required: true },
}, { _id: false });

const aboutSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'Rupalsha',
  },
  tagline: {
    type: String,
    default: 'Celebrating Indian heritage through modern fashion',
  },
  story: {
    type: String,
    default: '',
  },
  mission: {
    type: String,
    default: '',
  },
  vision: {
    type: String,
    default: '',
  },
  foundedYear: {
    type: Number,
    default: 2025,
  },
  coverImage: {
    url: String,
    public_id: String,
  },
  // Optional mobile-only cover (portrait). When present the public
  // About page renders this via a <picture> source query so phones
  // never see a banner cropped from a wide desktop image.
  coverImageMobile: {
    url: String,
    public_id: String,
  },
  // Admin-controlled visibility for the public "Meet Our Team" section.
  // When false the team grid (and the team-count stat) are hidden on
  // /about, but the underlying team data is preserved so the admin can
  // toggle it back on at any time.
  showTeam: {
    type: Boolean,
    default: true,
  },
  // Customer-facing promise chips shown under the hero on the public
  // About page. Editable from the admin panel; if the array is empty
  // the section is simply hidden.
  promises: {
    type: [promiseSchema],
    default: () => ([
      { icon: 'truck',  label: 'Faster Delivery' },
      { icon: 'heart',  label: 'Hand-picked Designs' },
      { icon: 'shield', label: 'Easy Return' },
      { icon: 'smile',  label: 'Dedicated Support' },
    ]),
  },
  team: [teamMemberSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('About', aboutSchema);
