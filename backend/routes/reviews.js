const express = require('express');
const { body } = require('express-validator');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews/product/:productId
router.get('/product/:productId', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Number(limit));

    const [reviews, total] = await Promise.all([
      Review.find({ product: req.params.productId, isApproved: true })
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Review.countDocuments({ product: req.params.productId, isApproved: true }),
    ]);

    res.json({ reviews, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews
router.post('/', auth, [
  body('productId').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').trim().notEmpty().isLength({ max: 2000 }),
], async (req, res, next) => {
  try {
    const { productId, rating, title, comment } = req.body;

    // Check if user purchased this product
    const hasOrdered = await Order.findOne({
      user: req.user._id,
      'items.product': productId,
      status: 'delivered',
    });

    if (!hasOrdered) {
      return res.status(400).json({ error: 'You can only review products you have purchased' });
    }

    const existingReview = await Review.findOne({ user: req.user._id, product: productId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const review = await Review.create({
      user: req.user._id,
      product: productId,
      rating,
      title,
      comment,
    });

    res.status(201).json({ review });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
