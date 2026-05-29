const express = require('express');
const { body } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Wallet = require('../models/Wallet');
const SiteSettings = require('../models/SiteSettings');
const { auth } = require('../middleware/auth');
const { sendOrderConfirmation, sendOrderCancellation, sendReturnConfirmation } = require('../utils/email');
const { applyWalletTransaction } = require('../utils/wallet');
const { createNotification } = require('../utils/notification');
const { orderMetrics } = require('../utils/orderMetrics');

const router = express.Router();

// Default for the free-shipping threshold (₹). The authoritative value
// lives in SiteSettings.freeShippingThreshold and is fetched per order
// placement so admin edits take effect immediately, without restart.
const FREE_SHIPPING_FALLBACK = 999;

// ISO-8601 week key (YYYY-Www) in UTC. Used as the bucket for the
// product `weeklySales` counter that powers "Selling fast" social proof.
function isoWeekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Bump the rolling weekly sales counter for a product. Either increments
// the existing bucket (when the stored week matches the current ISO week)
// or resets it to `qty`. Errors are swallowed — this is purely cosmetic
// social-proof copy and must never break order placement.
async function bumpWeeklySales(productId, qty) {
  try {
    const week = isoWeekKey();
    const res = await Product.updateOne(
      { _id: productId, 'weeklySales.week': week },
      { $inc: { 'weeklySales.count': qty } }
    );
    if (res.matchedCount === 0) {
      await Product.updateOne(
        { _id: productId },
        { $set: { weeklySales: { week, count: qty } } }
      );
    }
  } catch (err) {
    console.error('weeklySales bump failed', { productId, qty, err: err.message });
  }
}

/**
 * Lazy backfill of `refund` for old cancelled/returned orders that pre-date
 * the refund-tracker feature. Mutates and saves the order in-place if needed.
 * Safe to call on any order — it's a no-op when refund is already set.
 */
async function ensureRefundBackfill(order) {
  if (!order || !['cancelled', 'returned'].includes(order.status)) return order;
  const r = order.refund || {};
  // Already populated meaningfully — nothing to do
  if (r.method && r.method !== 'none') return order;
  if (r.status === 'processing' || r.status === 'refunded') return order;

  if (order.isPaid) {
    const amount = Math.max(0, (order.totalAmount || 0) - (order.cancellationFee || 0));
    order.refund = {
      method: 'wallet',
      status: 'refunded',
      amount,
      refundedAt: order.updatedAt || new Date(),
      updatedAt: new Date(),
      notes: 'Refund credited to wallet',
    };
  } else {
    order.refund = {
      method: 'none',
      status: 'not_applicable',
      amount: 0,
      updatedAt: new Date(),
    };
  }

  try {
    await order.save();
  } catch (err) {
    console.error('Refund backfill save failed:', err.message);
  }
  return order;
}

// POST /api/orders/validate
// Strict pre-payment validation. Re-reads every cart item from the source
// of truth (Product collection) and checks: existence, isActive, size,
// stock, price drift. NEVER mutates anything. Bypasses any caching so the
// caller sees the truth at this exact instant.
//
// Frontend calls this on the checkout page mount AND right before placing
// the order. If anything has changed, the user is shown the failing item
// and the order is not placed.
router.post('/validate', auth, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.json({ ok: false, reason: 'cart_empty', issues: [] });
    }
    const issues = [];
    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        issues.push({
          productId: item.product?._id,
          name: product?.name || 'Unknown',
          size: item.size,
          reason: 'unavailable',
          message: `${product?.name || 'A product'} is no longer available`,
        });
        continue;
      }
      const sizeInfo = product.sizes.find((s) => s.size === item.size);
      if (!sizeInfo) {
        issues.push({
          productId: product._id,
          name: product.name,
          size: item.size,
          reason: 'size_unavailable',
          message: `${product.name}: size ${item.size} is no longer offered`,
        });
        continue;
      }
      if (sizeInfo.stock < item.quantity) {
        issues.push({
          productId: product._id,
          name: product.name,
          size: item.size,
          reason: 'insufficient_stock',
          available: sizeInfo.stock,
          requested: item.quantity,
          message: sizeInfo.stock === 0
            ? `${product.name} (${item.size}) just went out of stock`
            : `Only ${sizeInfo.stock} left of ${product.name} (${item.size})`,
        });
      }
      // Surface price drift so the UI can re-confirm with the user.
      if (item.priceAtAdd && product.price !== item.priceAtAdd) {
        issues.push({
          productId: product._id,
          name: product.name,
          size: item.size,
          reason: 'price_changed',
          oldPrice: item.priceAtAdd,
          newPrice: product.price,
          message: `Price for ${product.name} changed from \u20B9${item.priceAtAdd} to \u20B9${product.price}`,
        });
      }
    }
    res.json({ ok: issues.length === 0, issues });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders - Create order
router.post('/', auth, [
  body('shippingAddress').isObject(),
  body('paymentMethod').isIn(['razorpay', 'cod', 'wallet']),
], async (req, res, next) => {
  try {
    orderMetrics.attempt(req.user._id);
    const { shippingAddress, paymentMethod, couponCode } = req.body;
    const useWallet = Boolean(req.body.useWallet);        // apply wallet as partial payment
    const walletAmountRequested = Math.max(0, Math.round(Number(req.body.walletAmount) || 0));

    // ---- Idempotency ----------------------------------------------------
    // Accept the key from a header (preferred) or body. If the same user
    // re-sends a request with the same key (network retry, double-click
    // through a flaky connection, etc.), return the previously-created
    // order instead of creating a duplicate.
    const idempotencyKey = (req.get('Idempotency-Key') || req.body.idempotencyKey || '').toString().trim().slice(0, 100) || null;
    if (idempotencyKey) {
      const existing = await Order.findOne({ user: req.user._id, idempotencyKey });
      if (existing) {
        return res.status(200).json({ order: existing, idempotent: true });
      }
    }

    // Block COD if it's disabled in site settings
    const settings = await SiteSettings.getSingleton();
    if (paymentMethod === 'cod') {
      if (!settings.codEnabled) {
        return res.status(400).json({ error: 'Cash on Delivery is currently unavailable' });
      }
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // ---- Build order line items (no stock mutation yet) -----------------
    // We do a soft pre-check here purely to short-circuit obviously-broken
    // orders. The authoritative stock check is the atomic conditional
    // decrement performed below.
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${item.product?.name || 'unknown'} is no longer available` });
      }
      const sizeInfo = product.sizes.find((s) => s.size === item.size);
      if (!sizeInfo) {
        return res.status(400).json({ error: `${product.name}: size ${item.size} is no longer offered` });
      }
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url,
        price: product.price,
        size: item.size,
        quantity: item.quantity,
      });
    }

    let itemsTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Use the highest per-product shipping charge from the cart items
    const maxProductShipping = Math.max(...cart.items.map(item => item.product.shippingCharge || 0));
    const freeShippingThreshold = Number.isFinite(settings.freeShippingThreshold)
      ? settings.freeShippingThreshold
      : FREE_SHIPPING_FALLBACK;
    let shippingCharge = itemsTotal >= freeShippingThreshold ? 0 : maxProductShipping;
    let discount = 0;

    // Apply coupon
    let couponDoc = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (coupon && itemsTotal >= coupon.minOrderAmount) {
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          return res.status(400).json({ error: 'Coupon usage limit reached' });
        }

        if (coupon.discountType === 'percentage') {
          discount = Math.round(itemsTotal * coupon.discountValue / 100);
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        } else {
          discount = coupon.discountValue;
        }

        couponDoc = coupon;
      }
    }

    const totalAmount = itemsTotal + shippingCharge - discount;

    // Determine wallet usage (logic unchanged)
    let walletAmount = 0;
    if (paymentMethod === 'wallet' || useWallet) {
      const wallet = await Wallet.findOrCreate(req.user._id);
      if (paymentMethod === 'wallet') {
        if (wallet.balance < totalAmount) {
          return res.status(400).json({ error: `Wallet balance (\u20B9${wallet.balance}) is less than total (\u20B9${totalAmount}).` });
        }
        walletAmount = totalAmount;
      } else {
        const requested = walletAmountRequested > 0 ? walletAmountRequested : wallet.balance;
        walletAmount = Math.min(wallet.balance, requested, totalAmount);
      }
    }

    const remainingToPay = totalAmount - walletAmount;
    const effectivePaymentMethod = remainingToPay === 0 ? 'wallet' : paymentMethod === 'wallet' ? 'wallet' : paymentMethod;

    // ---- ATOMIC STOCK RESERVATION --------------------------------------
    // For each line item, do a conditional `findOneAndUpdate` that only
    // succeeds if there is enough stock for that size. Two concurrent
    // orders for the last unit cannot both win: MongoDB serializes the
    // matching predicate + $inc as a single document operation.
    //
    // We track each successful decrement so we can roll them back if any
    // later step (subsequent item, wallet debit, order creation) fails.
    const reserved = []; // { productId, size, quantity }
    const rollbackStock = async () => {
      for (const r of reserved) {
        try {
          await Product.updateOne(
            { _id: r.productId, 'sizes.size': r.size },
            { $inc: { 'sizes.$.stock': r.quantity } }
          );
        } catch (err) {
          console.error('Stock rollback failed', { item: r, err: err.message });
        }
      }
    };

    for (const item of orderItems) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.product,
          isActive: true,
          sizes: { $elemMatch: { size: item.size, stock: { $gte: item.quantity } } },
        },
        // Bump the lifetime salesCount in the same atomic write that
        // reserves stock — guarantees the counter can never claim more
        // sales than orders actually placed.
        { $inc: { 'sizes.$.stock': -item.quantity, salesCount: item.quantity } },
        { new: true }
      );
      if (!updated) {
        await rollbackStock();
        // Read latest to give the user a precise message.
        const product = await Product.findById(item.product, 'name sizes isActive').lean();
        const sizeInfo = product?.sizes?.find((s) => s.size === item.size);
        const available = sizeInfo?.stock ?? 0;
        const message = !product?.isActive
          ? `${item.name} is no longer available`
          : available === 0
            ? `${item.name} (${item.size}) just went out of stock`
            : `Only ${available} left of ${item.name} (${item.size})`;
        orderMetrics.failure({
          userId: req.user._id,
          step: 'stock',
          reason: 'insufficient_stock',
          statusCode: 409,
          productId: item.product,
          size: item.size,
          requested: item.quantity,
          available,
          message,
        });
        return res.status(409).json({
          error: message,
          reason: 'insufficient_stock',
          productId: item.product,
          size: item.size,
          available,
        });
      }
      reserved.push({ productId: item.product, size: item.size, quantity: item.quantity });
      // Fire-and-forget rolling weekly counter bump — purely cosmetic
      // social-proof signal, never block the order.
      bumpWeeklySales(item.product, item.quantity);
    }

    // ---- Wallet debit (atomic with $gte guard inside applyWalletTransaction)
    let walletTxId = null;
    if (walletAmount > 0) {
      try {
        const { transaction } = await applyWalletTransaction({
          userId: req.user._id,
          type: 'debit',
          source: 'order_payment',
          amount: walletAmount,
          description: `Payment for order (pending creation)`,
        });
        walletTxId = transaction._id;
      } catch (err) {
        await rollbackStock();
        orderMetrics.failure({
          userId: req.user._id,
          step: 'wallet',
          reason: 'wallet_debit_failed',
          statusCode: err.statusCode || 400,
          message: err.message,
        });
        return res.status(err.statusCode || 400).json({
          error: err.message || 'Wallet debit failed. Please check your balance.',
        });
      }
    }

    // ---- Persist coupon usage (after stock+wallet succeed) -------------
    if (couponDoc) {
      try {
        couponDoc.usedCount += 1;
        await couponDoc.save();
      } catch (err) {
        // Non-fatal — coupon over-use will self-limit on next request.
        console.error('Coupon usage save failed', err.message);
      }
    }

    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        items: orderItems,
        shippingAddress,
        paymentMethod: effectivePaymentMethod,
        itemsTotal,
        shippingCharge,
        discount,
        walletAmount,
        couponCode: couponCode?.toUpperCase(),
        totalAmount,
        idempotencyKey,
        // Fully wallet-paid orders are immediately paid & confirmed.
        isPaid: effectivePaymentMethod === 'wallet' ? true : false,
        paidAt: effectivePaymentMethod === 'wallet' ? new Date() : undefined,
        status: effectivePaymentMethod === 'cod' || effectivePaymentMethod === 'wallet' ? 'confirmed' : 'pending',
      });
    } catch (err) {
      // Order creation failed — refund wallet AND restore stock.
      await rollbackStock();
      if (walletAmount > 0) {
        try {
          await applyWalletTransaction({
            userId: req.user._id,
            type: 'credit',
            source: 'order_refund',
            amount: walletAmount,
            description: 'Auto-refund: order creation failed',
          });
        } catch (e) {
          console.error('Wallet refund after order-create fail also failed', e.message);
        }
      }
      // Duplicate idempotency key race — return the winner if present.
      if (err && err.code === 11000 && idempotencyKey) {
        const existing = await Order.findOne({ user: req.user._id, idempotencyKey });
        if (existing) return res.status(200).json({ order: existing, idempotent: true });
      }
      orderMetrics.failure({
        userId: req.user._id,
        step: 'create',
        reason: 'order_create_failed',
        statusCode: 500,
        message: err.message,
      });
      throw err;
    }

    // Link the wallet debit transaction to the newly-created order.
    if (walletTxId) {
      try {
        const WalletTransaction = require('../models/WalletTransaction');
        await WalletTransaction.updateOne(
          { _id: walletTxId },
          { $set: { order: order._id, description: `Payment for order ${order.orderNumber}` } }
        );
      } catch {}
    }

    // Clear cart
    await Cart.findOneAndDelete({ user: req.user._id });

    // Send email (non-blocking)
    sendOrderConfirmation(order, req.user.email);

    // Notification — order placed
    createNotification({
      user: req.user._id,
      category: 'order',
      type: 'order.placed',
      title: `Order placed \u00B7 ${order.orderNumber}`,
      message: effectivePaymentMethod === 'cod'
        ? `Your order of \u20B9${order.totalAmount.toLocaleString('en-IN')} has been placed. Pay on delivery.`
        : effectivePaymentMethod === 'wallet'
          ? `Your order of \u20B9${order.totalAmount.toLocaleString('en-IN')} has been placed and paid via wallet.`
          : `Your order has been placed. Complete payment of \u20B9${Math.max(0, (order.totalAmount || 0) - (order.walletAmount || 0)).toLocaleString('en-IN')} to confirm.`,
      link: `/orders/${order._id}`,
      meta: { orderId: order._id, orderNumber: order.orderNumber, totalAmount: order.totalAmount },
    });

    res.status(201).json({ order });
    orderMetrics.success({
      userId: req.user._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      paymentMethod: effectivePaymentMethod,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders - User's orders
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Number(limit));

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments({ user: req.user._id }),
    ]);

    res.json({ orders, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('items.product', 'slug images isReturnable');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await ensureRefundBackfill(order);
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/cancel
router.put('/:id/cancel', auth, [
  body('reason').trim().notEmpty(),
  body('acknowledgeFee').optional().isBoolean(),
], async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const cancellableStatuses = ['pending', 'confirmed', 'processing', 'shipped'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    // Compute cancellation fee for shipped orders
    let cancellationFee = 0;
    if (order.status === 'shipped') {
      const settings = await SiteSettings.getSingleton();

      // If the cancellation-fee feature is disabled, shipped orders cannot be cancelled.
      if (!settings.cancellationFeeEnabled) {
        return res.status(400).json({
          error: 'Order cannot be cancelled — it has already been shipped',
        });
      }

      const pct = Number(settings.cancellationFeePercent) || 0;
      const cap = Number(settings.cancellationFeeCap) || 0;
      cancellationFee = Math.round(Math.min((order.totalAmount * pct) / 100, cap));

      // Require explicit acknowledgement when a fee applies
      if (cancellationFee > 0 && !req.body.acknowledgeFee) {
        return res.status(400).json({
          error: 'Cancellation fee acknowledgement required',
          cancellationFee,
          cancellationFeePercent: pct,
          cancellationFeeCap: cap,
        });
      }
    }

    order.status = 'cancelled';
    order.cancelReason = req.body.reason;
    order.cancellationFee = cancellationFee;

    // Void any pending post-purchase reward — cancelling forfeits the
    // wallet credit the user "won" at checkout time.
    try {
      const Reward = require('../models/Reward');
      await Reward.updateOne(
        { type: 'post_purchase', order: order._id, creditStatus: 'pending' },
        { $set: { creditStatus: 'voided' } }
      );
    } catch (rewardErr) {
      console.error('[reward] void on cancel failed:', rewardErr.message);
    }

    // Refund handling
    const refundAmount = order.isPaid ? Math.max(0, order.totalAmount - cancellationFee) : 0;
    if (!order.isPaid || refundAmount === 0) {
      // Unpaid (e.g. COD not yet paid) — no refund needed
      order.refund = {
        method: 'none',
        status: 'not_applicable',
        amount: 0,
        updatedAt: new Date(),
      };
    } else {
      // Paid — credit wallet automatically and mark as refunded
      order.refund = {
        method: 'wallet',
        status: 'refunded',
        amount: refundAmount,
        refundedAt: new Date(),
        updatedAt: new Date(),
        notes: cancellationFee > 0
          ? `Refund of ₹${refundAmount} credited to wallet (₹${cancellationFee} cancellation fee deducted)`
          : `Refund of ₹${refundAmount} credited to wallet`,
      };
    }

    await order.save();

    // Credit wallet for paid orders
    if (refundAmount > 0) {
      try {
        await applyWalletTransaction({
          userId: order.user,
          type: 'credit',
          source: 'order_refund',
          amount: refundAmount,
          description: cancellationFee > 0
            ? `Refund for cancelled order ${order.orderNumber} (₹${cancellationFee} cancellation fee deducted)`
            : `Refund for cancelled order ${order.orderNumber}`,
          order: order._id,
        });
      } catch (err) {
        console.error('Wallet refund on cancel failed:', err.message);
        // Mark refund as processing so admin can investigate
        order.refund.status = 'processing';
        order.refund.notes = 'Automatic wallet refund failed — please review';
        await order.save();
      }
    }

    // Send cancellation email
    sendOrderCancellation(order, req.user.email, req.body.reason);

    // Notification — order cancelled
    createNotification({
      user: order.user,
      category: 'order',
      type: 'order.cancelled',
      title: `Order cancelled · ${order.orderNumber}`,
      message: refundAmount > 0
        ? `Your order has been cancelled. ₹${refundAmount.toLocaleString('en-IN')} refunded to your wallet${cancellationFee > 0 ? ` (₹${cancellationFee} fee deducted)` : ''}.`
        : `Your order has been cancelled.`,
      link: `/orders/${order._id}`,
      meta: { orderId: order._id, orderNumber: order.orderNumber, refundAmount, cancellationFee },
    });

    // Restore stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, 'sizes.size': item.size },
        { $inc: { 'sizes.$.stock': item.quantity } }
      );
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/return
router.put('/:id/return', auth, [
  body('reason').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Only delivered orders can be returned' });
    }

    // Check if all products in the order are returnable
    const productIds = order.items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).select('isReturnable returnDays name');
    const nonReturnableItems = products.filter(p => p.isReturnable === false);
    if (nonReturnableItems.length > 0) {
      const names = nonReturnableItems.map(p => p.name).join(', ');
      return res.status(400).json({ error: `Return not available for: ${names}. These items have a no-return policy.` });
    }

    // Check return window based on per-product returnDays
    if (order.deliveredAt) {
      const daysSinceDelivery = Math.floor((Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
      const maxReturnDays = Math.max(...products.map(p => p.returnDays || 7));
      if (daysSinceDelivery > maxReturnDays) {
        return res.status(400).json({ error: `Return window has expired. The return period of ${maxReturnDays} day(s) from delivery has passed.` });
      }
    }

    order.status = 'returned';
    order.returnReason = req.body.reason;
    await order.save();

    // Send return confirmation email
    sendReturnConfirmation(order, req.user.email, req.body.reason);

    // Notification — return requested
    createNotification({
      user: order.user,
      category: 'order',
      type: 'order.return_requested',
      title: `Return requested · ${order.orderNumber}`,
      message: `Your return request has been received. We'll keep you posted.`,
      link: `/orders/${order._id}`,
      meta: { orderId: order._id, orderNumber: order.orderNumber },
    });

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
