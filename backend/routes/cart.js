const express = require('express');
const { body } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/cart
router.get('/', auth, async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name price comparePrice images sizes slug');
    if (!cart) {
      cart = { items: [] };
    }
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// POST /api/cart/add
router.post('/add', auth, [
  body('productId').notEmpty(),
  body('size').notEmpty(),
  body('quantity').isInt({ min: 1 }),
], async (req, res, next) => {
  try {
    const { productId, size, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const sizeInfo = product.sizes.find(s => s.size === size);
    if (!sizeInfo || sizeInfo.stock < quantity) {
      return res.status(400).json({ error: 'Size not available or insufficient stock' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingItem = cart.items.find(
      item => item.product.toString() === productId && item.size === size
    );

    const newTotal = (existingItem ? existingItem.quantity : 0) + quantity;
    if (newTotal > sizeInfo.stock) {
      return res.status(400).json({ error: `Only ${sizeInfo.stock} items available in this size` });
    }

    if (existingItem) {
      existingItem.quantity = newTotal;
    } else {
      cart.items.push({ product: productId, size, quantity });
    }

    await cart.save();
    await cart.populate('items.product', 'name price comparePrice images sizes slug');
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// PUT /api/cart/update
router.put('/update', auth, [
  body('itemId').notEmpty(),
  body('quantity').isInt({ min: 0 }),
], async (req, res, next) => {
  try {
    const { itemId, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    if (quantity === 0) {
      cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    } else {
      const item = cart.items.id(itemId);
      if (!item) return res.status(404).json({ error: 'Item not found in cart' });

      const product = await Product.findById(item.product);
      if (product) {
        const sizeInfo = product.sizes.find(s => s.size === item.size);
        if (sizeInfo && quantity > sizeInfo.stock) {
          return res.status(400).json({ error: `Only ${sizeInfo.stock} items available in this size` });
        }
      }

      item.quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.product', 'name price comparePrice images sizes slug');
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cart/remove/:itemId
router.delete('/remove/:itemId', auth, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
    await cart.save();
    await cart.populate('items.product', 'name price comparePrice images sizes slug');
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cart/clear
router.delete('/clear', auth, async (req, res, next) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ cart: { items: [] } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
