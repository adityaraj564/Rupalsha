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
  // Admin-controlled visibility for the public "Meet Our Team" section.
  // When false the team grid (and the team-count stat) are hidden on
  // /about, but the underlying team data is preserved so the admin can
  // toggle it back on at any time.
  showTeam: {
    type: Boolean,
    default: true,
  },
  team: [teamMemberSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('About', aboutSchema);
