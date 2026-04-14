const express = require('express');
const { query } = require('express-validator');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/products - List products with filters
router.get('/', async (req, res, next) => {
  try {
    const {
      category, search, sort, minPrice, maxPrice,
      size, page = 1, limit = 12, featured, trending,
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (featured === 'true') filter.isFeatured = true;
    if (trending === 'true') filter.isTrending = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (size) {
      filter['sizes.size'] = size;
      filter['sizes.stock'] = { $gt: 0 };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'popular') sortOption = { numReviews: -1 };
    else if (sort === 'rating') sortOption = { averageRating: -1 };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
