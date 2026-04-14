const express = require('express');
const { body } = require('express-validator');
const Coupon = require('../models/Coupon');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/coupons/validate
router.post('/validate', auth, [
  body('code').trim().notEmpty(),
  body('orderTotal').isNumeric(),
], async (req, res, next) => {
  try {
    const { code, orderTotal } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!coupon) {
      return res.status(400).json({ error: 'Invalid or expired coupon' });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    if (orderTotal < coupon.minOrderAmount) {
      return res.status(400).json({ error: `Minimum order amount ₹${coupon.minOrderAmount} required` });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round(orderTotal * coupon.discountValue / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }

    res.json({
      valid: true,
      discount,
      code: coupon.code,
      description: coupon.description,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/coupons/active - public, no auth
router.get('/active', async (req, res, next) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).select('code description discountType discountValue minOrderAmount').sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
