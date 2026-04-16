const express = require('express');
const mongoose = require('mongoose');
const { query } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/products - List products with filters
router.get('/', async (req, res, next) => {
  try {
    const {
      category, categorySlug, search, sort, minPrice, maxPrice,
      size, page = 1, limit = 12, featured, trending, hideOutOfStock,
    } = req.query;

    const filter = { isActive: true };

    if (hideOutOfStock === 'true') {
      filter['sizes.stock'] = { $gt: 0 };
    }

    // Support filtering by category slug (hierarchical - includes descendants)
    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug, isActive: true });
      if (cat) {
        const allCats = await Category.find({ isActive: true }).lean();
        const descendantIds = getDescendantIds(allCats, cat._id);
        descendantIds.push(cat._id);
        filter.categoryRef = { $in: descendantIds };
      }
    } else if (category) {
      filter.category = category;
    }

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
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { category: searchRegex },
        { fabric: searchRegex },
      ];
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

// GET /api/products/:slug/similar - Get similar products
router.get('/:slug/similar', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

    // Base filter: active, not this product, and in stock (at least one size with stock > 0)
    const baseFilter = {
      isActive: true,
      _id: { $ne: product._id },
      'sizes.stock': { $gt: 0 },
    };

    const results = new Map(); // _id -> { product, score }

    // 1. Match by tags (highest priority)
    if (product.tags && product.tags.length > 0) {
      const tagMatches = await Product.find({
        ...baseFilter,
        tags: { $in: product.tags },
      }).limit(limit).lean();

      for (const p of tagMatches) {
        const matchedTags = p.tags.filter(t => product.tags.includes(t)).length;
        results.set(p._id.toString(), { product: p, score: 30 + matchedTags * 10 });
      }
    }

    // 2. Match by name keywords
    const nameWords = product.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (nameWords.length > 0) {
      const nameRegex = nameWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const nameMatches = await Product.find({
        ...baseFilter,
        name: { $regex: nameRegex, $options: 'i' },
      }).limit(limit).lean();

      for (const p of nameMatches) {
        const id = p._id.toString();
        const matchedWords = nameWords.filter(w => new RegExp(w, 'i').test(p.name)).length;
        const score = 20 + matchedWords * 5;
        if (results.has(id)) {
          results.get(id).score += score;
        } else {
          results.set(id, { product: p, score });
        }
      }
    }

    // 3. Same category fallback
    if (results.size < limit) {
      const categoryMatches = await Product.find({
        ...baseFilter,
        category: product.category,
      }).limit(limit).lean();

      for (const p of categoryMatches) {
        const id = p._id.toString();
        if (!results.has(id)) {
          results.set(id, { product: p, score: 10 });
        }
      }
    }

    // 4. General fallback if still not enough
    if (results.size < limit) {
      const remaining = limit - results.size;
      const excludeIds = [product._id, ...Array.from(results.keys()).map(id => new mongoose.Types.ObjectId(id))];
      const fallback = await Product.find({
        ...baseFilter,
        _id: { $nin: excludeIds },
      }).sort({ averageRating: -1, numReviews: -1 }).limit(remaining).lean();

      for (const p of fallback) {
        results.set(p._id.toString(), { product: p, score: 1 });
      }
    }

    // Sort by score descending and return
    const similar = Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.product);

    res.json({ products: similar });
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

function getDescendantIds(allCategories, parentId) {
  const children = allCategories.filter(c => c.parent && c.parent.toString() === parentId.toString());
  let ids = children.map(c => c._id);
  for (const child of children) {
    ids = ids.concat(getDescendantIds(allCategories, child._id));
  }
  return ids;
}

module.exports = router;
