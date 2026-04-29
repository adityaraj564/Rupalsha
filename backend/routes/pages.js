const express = require('express');
const PageContent = require('../models/PageContent');
const { subAdminAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLog');
const { broadcastToAllUsers } = require('../utils/notification');

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
    offerImage: '/defaults/banner-2.jpg',
  },
  'home-hero': {
    title: 'Home Hero',
    content: 'Discover handcrafted jewellery that tells your story. From timeless classics to modern masterpieces — crafted with love.',
    heroEyebrow: 'Exquisite Jewellery Collection',
    heroTitle: 'Adorn Your',
    heroAccent: 'Elegance',
  },
  'home-features': {
    title: 'Home Features',
    content: 'Edit the feature highlights shown on the home page.',
    features: [
      { icon: 'FiTruck',     title: 'Faster Delivery',     desc: 'Quick & reliable shipping' },
      { icon: 'FiRefreshCw', title: 'Easy Returns',        desc: 'Hassle-free returns' },
      { icon: 'FiShield',    title: 'Certified Jewellery', desc: 'Quality guaranteed' },
      { icon: 'FiHeart',     title: 'Handcrafted',         desc: 'Made with love' },
    ],
  },
  'home-marquee': {
    title: 'Home Announcement Marquee',
    content: '✦ Free Shipping on Orders Above ₹999 | ✦ Hallmark Certified Jewellery | ✦ Easy 7-Day Returns | ✦ New Arrivals Every Week | ✦ Cash on Delivery Available',
  },
  'footer-about': {
    title: 'Footer Brand',
    content: 'Adorn Your Elegance. Discover handcrafted jewellery that tells your story — from timeless classics to modern masterpieces.',
    brandName: 'RUPALSHA',
  },
};

// GET /api/pages?keys=a,b,c - Public: batch fetch multiple pages in one round-trip
router.get('/', async (req, res, next) => {
  try {
    const raw = String(req.query.keys || '').trim();
    if (!raw) return res.json({ pages: {} });
    const keys = raw.split(',').map((k) => k.trim()).filter((k) => DEFAULTS[k]);
    if (keys.length === 0) return res.json({ pages: {} });

    const found = await PageContent.find({ pageKey: { $in: keys } }).lean();
    const byKey = Object.fromEntries(found.map((p) => [p.pageKey, p]));

    // Lazily create any missing defaults so first request is self-healing.
    const missing = keys.filter((k) => !byKey[k]);
    if (missing.length > 0) {
      const created = await PageContent.insertMany(
        missing.map((k) => ({ pageKey: k, ...DEFAULTS[k] })),
        { ordered: false }
      ).catch(() => []);
      created.forEach((doc) => { byKey[doc.pageKey] = doc.toObject(); });
    }

    res.json({ pages: byKey });
  } catch (error) {
    next(error);
  }
});

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

    const { title, content, contactEmail, contactPhone, supportHours, offerHeading, offerCode, offerDescription, offerLink, offerImage, heroEyebrow, heroTitle, heroAccent, features, brandName } = req.body;
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
    if (heroEyebrow !== undefined) update.heroEyebrow = heroEyebrow;
    if (heroTitle !== undefined) update.heroTitle = heroTitle;
    if (heroAccent !== undefined) update.heroAccent = heroAccent;
    if (brandName !== undefined) update.brandName = brandName;
    if (Array.isArray(features)) {
      update.features = features
        .filter((f) => f && (f.title || f.desc))
        .map((f) => ({
          icon: String(f.icon || 'FiTruck').slice(0, 40),
          title: String(f.title || '').slice(0, 80),
          desc: String(f.desc || '').slice(0, 160),
        }));
    }

    const page = await PageContent.findOneAndUpdate(
      { pageKey: key },
      update,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    logActivity({ action: 'update', section: 'page', description: `Updated page: ${key}`, user: req.user });

    // Broadcast policy changes (only for legally meaningful pages, and only
    // when the actual title or content changed — not contact details, etc.)
    const policyKeys = {
      shipping: { title: 'Shipping policy updated', body: 'We\u2019ve updated our shipping policy. Tap to review the latest delivery timelines and charges.' },
      returns:  { title: 'Returns policy updated',  body: 'We\u2019ve updated our returns & exchange policy. Tap to read the new terms.' },
      privacy:  { title: 'Privacy policy updated',  body: 'Our privacy policy has been updated. Please review how we handle your data.' },
      terms:    { title: 'Terms of service updated', body: 'Our terms of service have been updated. Tap to review the changes.' },
    };
    if (policyKeys[key] && (update.title !== undefined || update.content !== undefined)) {
      broadcastToAllUsers({
        category: 'alert',
        type: `policy.${key}`,
        title: policyKeys[key].title,
        message: policyKeys[key].body,
        link: key === 'shipping' ? '/help' : key === 'returns' ? '/help' : `/${key}`,
        meta: { pageKey: key },
      });
    }

    res.json({ page });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
