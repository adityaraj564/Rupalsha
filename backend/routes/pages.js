const express = require('express');
const PageContent = require('../models/PageContent');
const { subAdminAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();

const DEFAULTS = {
  shipping: {
    title: 'Shipping Information',
    content: '<p>We ship across India via trusted courier partners.</p><ul><li>Standard delivery: 5-7 business days</li><li>Metro cities: 3-5 business days</li><li>Free shipping on orders above ₹999</li><li>Shipping charges vary by product</li></ul>',
  },
  returns: {
    title: 'Returns & Exchange',
    content: '<p>We want you to love what you buy. If not, returns are easy!</p><ul><li>Return window varies per product (check the product page for exact days)</li><li>Products must be unused with original tags</li><li>Refund processed within 5-7 business days</li><li>Intimates and accessories are non-returnable</li></ul><div class="warning"><p><strong>⚠️ Mandatory: Unboxing Video Required</strong></p><p>You must record a video while opening your package. This unboxing video is mandatory for processing any return or exchange request. Claims without an unboxing video will not be accepted.</p></div>',
  },
  contact: {
    title: 'Contact Us',
    content: '<p>We\'d love to hear from you! Reach us through the following channels.</p>',
    contactEmail: 'support@rupalsha.com',
    contactPhone: '+91 79798 04477',
    supportHours: 'Monday to Saturday, 10 AM to 6 PM IST',
  },
  privacy: {
    title: 'Privacy Policy',
    content: '<p>We respect your privacy and are committed to protecting your personal data.</p><p>We collect only necessary information for order processing and improving your experience. Your data is never sold to third parties.</p>',
  },
  terms: {
    title: 'Terms of Service',
    content: '<p>By using Rupalsha, you agree to our terms of service.</p><p>All products are subject to availability. Prices are in INR and inclusive of taxes. For complete terms, please contact our support team.</p>',
  },
  'special-offer': {
    title: 'Special Offer',
    content: 'Valid on all products.',
    offerHeading: 'Get 10% Off Your First Order',
    offerCode: 'RUP10',
    offerDescription: 'at checkout',
    offerLink: '/products',
    offerImage: 'https://images.unsplash.com/photo-1515562141589-67f0d569b5e9?w=1200',
  },
};

// GET /api/pages/:key - Public: get page content
router.get('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!DEFAULTS[key]) return res.status(404).json({ error: 'Page not found' });

    let page = await PageContent.findOne({ pageKey: key }).lean();
    if (!page) {
      page = await PageContent.create({ pageKey: key, ...DEFAULTS[key] });
      page = page.toObject();
    }
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

// GET /api/pages/admin/all - Admin/SubAdmin: get all pages
router.get('/admin/all', subAdminAuth, async (req, res, next) => {
  try {
    // Ensure all default pages exist
    for (const [key, defaults] of Object.entries(DEFAULTS)) {
      const exists = await PageContent.findOne({ pageKey: key });
      if (!exists) await PageContent.create({ pageKey: key, ...defaults });
    }
    const pages = await PageContent.find().sort({ pageKey: 1 }).lean();
    res.json({ pages });
  } catch (error) {
    next(error);
  }
});

// PUT /api/pages/admin/:key - Admin/SubAdmin: update page
router.put('/admin/:key', subAdminAuth, async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!DEFAULTS[key]) return res.status(404).json({ error: 'Page not found' });

    const { title, content, contactEmail, contactPhone, supportHours, offerHeading, offerCode, offerDescription, offerLink, offerImage } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (contactEmail !== undefined) update.contactEmail = contactEmail;
    if (contactPhone !== undefined) update.contactPhone = contactPhone;
    if (supportHours !== undefined) update.supportHours = supportHours;
    if (offerHeading !== undefined) update.offerHeading = offerHeading;
    if (offerCode !== undefined) update.offerCode = offerCode;
    if (offerDescription !== undefined) update.offerDescription = offerDescription;
    if (offerLink !== undefined) update.offerLink = offerLink;
    if (offerImage !== undefined) update.offerImage = offerImage;

    const page = await PageContent.findOneAndUpdate(
      { pageKey: key },
      update,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    logActivity({ action: 'update', section: 'page', description: `Updated page: ${key}`, user: req.user });
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
