const mongoose = require('mongoose');

// Singleton settings document. Use SiteSettings.getSingleton() to fetch/create.
const siteSettingsSchema = new mongoose.Schema({
  // Cancellation fee for orders cancelled after the 'shipped' stage.
  // Fee = min(totalAmount * cancellationFeePercent / 100, cancellationFeeCap)
  // When disabled, shipped orders cannot be cancelled at all.
  cancellationFeeEnabled: { type: Boolean, default: false },
  cancellationFeePercent: { type: Number, default: 50, min: 0, max: 100 },
  cancellationFeeCap: { type: Number, default: 100, min: 0 },

  // Cash on Delivery toggle. When false, customers cannot select COD at checkout.
  codEnabled: { type: Boolean, default: false },
}, { timestamps: true });

siteSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
