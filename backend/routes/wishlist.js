const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/wishlist
router.get('/', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist', 'name price comparePrice images slug category averageRating');
    res.json({ wishlist: user.wishlist });
  } catch (error) {
    next(error);
  }
});

// POST /api/wishlist/:productId
router.post('/:productId', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;

    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    user.wishlist.push(productId);
    await user.save();
    res.json({ message: 'Added to wishlist' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
