const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  // Balance in INR (whole rupees; paise not used to avoid drift).
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

// Returns the wallet for a user, creating it lazily if needed.
walletSchema.statics.findOrCreate = async function (userId) {
  let wallet = await this.findOne({ user: userId });
  if (!wallet) {
    wallet = await this.create({ user: userId, balance: 0 });
  }
  return wallet;
};

module.exports = mongoose.model('Wallet', walletSchema);
