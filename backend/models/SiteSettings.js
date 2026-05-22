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

  // Unboxing video notice on the Returns & Exchange section of the Help page.
  // When true, a red-bordered mandatory notice is shown to customers.
  unboxingVideoNoticeEnabled: { type: Boolean, default: true },

  // Free shipping threshold (₹). Orders whose items total ≥ this amount
  // ship free; below it, the standard product shipping charge applies.
  // Used by:
  //   - backend/routes/orders.js when computing shippingCharge at placement
  //   - frontend cart / checkout pages when previewing the total
  //   - header strip, product detail page "Free shipping above ₹X" copy
  // Editable from Admin → Site Settings. Default mirrors the original
  // hard-coded ₹999 so existing live behaviour is unchanged on first deploy.
  freeShippingThreshold: { type: Number, default: 999, min: 0 },
}, { timestamps: true });

siteSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
