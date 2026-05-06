const express = require('express');
const Banner = require('../models/Banner');
const cache = require('../utils/cache');

const router = express.Router();

// GET /api/banners - public active banners
router.get('/', async (req, res, next) => {
  try {
    const cacheKey = 'banners:active';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const banners = await Banner.find({ isActive: true })
      .sort({ order: 1 })
      .select('image mobileImage title link')
      .lean();

    cache.set(cacheKey, banners, 300); // 5 min TTL
    res.json(banners);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
