const mongoose = require('mongoose');

// Single-document collection used as a global counter for the anti-frustration
// rule: after N consecutive Better-Luck outcomes across all users, the next
// losing reward is forced to win the smallest payout for its stage. The
// counter resets on every actual win.
//
// Stored as a doc (rather than Redis / in-memory) so it survives restarts and
// stays consistent across web + worker dynos on Render.
//
// Note: originally called "SpinCounter" — collection stays `spincounters` to
// preserve existing state without migration.
const rewardCounterSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  consecutiveLosses: { type: Number, default: 0 },
}, { timestamps: true });

// Returns the singleton counter row, creating it lazily on first call.
rewardCounterSchema.statics.getGlobal = async function () {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global', consecutiveLosses: 0 });
  return doc;
};

module.exports = mongoose.model('RewardCounter', rewardCounterSchema, 'spincounters');
