/**
 * MongoDB → MySQL Backup Sync Script
 *
 * Reads all data from MongoDB and upserts it into MySQL.
 * Run manually or via cron: npm run backup:mysql
 *
 * Required env vars (in .env):
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { initMySQL, getPool } = require('../config/mysql');
const connectDB = require('../config/db');

// Import all models
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const Contact = require('../models/Contact');
const About = require('../models/About');
const Cart = require('../models/Cart');

const toDatetime = (d) => (d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : null);
const toJSON = (v) => (v !== undefined && v !== null ? JSON.stringify(v) : null);

// ── Sync functions ──────────────────────────────────────────────

async function syncUsers(db) {
  const users = await User.find().lean();
  let count = 0;
  for (const u of users) {
    await db.execute(
      `REPLACE INTO users (mongo_id, name, email, phone, role, is_blocked, addresses, wishlist, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u._id.toString(), u.name, u.email, u.phone || null, u.role,
        u.isBlocked || false, toJSON(u.addresses), toJSON(u.wishlist),
        toDatetime(u.createdAt), toDatetime(u.updatedAt),
      ]
    );
    count++;
  }
  return count;
}

async function syncProducts(db) {
  const products = await Product.find().lean();
  let count = 0;
  for (const p of products) {
    await db.execute(
      `REPLACE INTO products (mongo_id, name, slug, description, price, compare_price, category, subcategory, child_category, product_code, sku, shipping_charge, low_stock_threshold, images, sizes, colors, fabric, care_instructions, tags, average_rating, num_reviews, is_featured, is_trending, is_active, is_returnable, return_days, return_policy, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p._id.toString(), p.name, p.slug, p.description, p.price,
        p.comparePrice || null, p.category, p.subcategory || null, p.childCategory || null,
        p.productCode || null, p.sku || null, p.shippingCharge || 0, p.lowStockThreshold || 5,
        toJSON(p.images), toJSON(p.sizes), toJSON(p.colors),
        p.fabric || null, p.careInstructions || null, toJSON(p.tags),
        p.averageRating || 0, p.numReviews || 0,
        p.isFeatured || false, p.isTrending || false, p.isActive !== false,
        p.isReturnable !== false, p.returnDays || 7, p.returnPolicy || null,
        toDatetime(p.createdAt), toDatetime(p.updatedAt),
      ]
    );
    count++;
  }
  return count;
}

async function syncOrders(db) {
  const orders = await Order.find().lean();
  let count = 0;
  for (const o of orders) {
    await db.execute(
      `REPLACE INTO orders (mongo_id, user_id, order_number, items, shipping_address, payment_method, payment_result, items_total, shipping_charge, discount, coupon_code, total_amount, is_paid, paid_at, status, tracking_number, delivered_at, cancel_reason, return_reason, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o._id.toString(), o.user?.toString() || null, o.orderNumber,
        toJSON(o.items), toJSON(o.shippingAddress), o.paymentMethod,
        toJSON(o.paymentResult), o.itemsTotal, o.shippingCharge || 0,
        o.discount || 0, o.couponCode || null, o.totalAmount,
        o.isPaid || false, toDatetime(o.paidAt), o.status,
        o.trackingNumber || null, toDatetime(o.deliveredAt),
        o.cancelReason || null, o.returnReason || null, o.notes || null,
        toDatetime(o.createdAt), toDatetime(o.updatedAt),
      ]
    );
    count++;
  }
  return count;
}

async function syncCategories(db) {
  const categories = await Category.find().lean();
  let count = 0;
  for (const c of categories) {
    await db.execute(
      `REPLACE INTO categories (mongo_id, name, slug, parent_id, level, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c._id.toString(), c.name, c.slug, c.parent?.toString() || null,
        c.level, c.isActive !== false, c.sortOrder || 0,
        toDatetime(c.createdAt), toDatetime(c.updatedAt),
      ]
    );
    count++;
  }
  return count;
}

async function syncCoupons(db) {
  const coupons = await Coupon.find().lean();
  let count = 0;
  for (const c of coupons) {
    await db.execute(
      `REPLACE INTO coupons (mongo_id, code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, used_count, is_active, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c._id.toString(), c.code, c.description || null, c.discountType,
        c.discountValue, c.minOrderAmount || 0, c.maxDiscount || null,
        c.usageLimit || null, c.usedCount || 0, c.isActive !== false,
        toDatetime(c.expiresAt), toDatetime(c.createdAt), toDatetime(c.updatedAt),
      ]
    );
    count++;
  }
  return count;
}

async function syncReviews(db) {
  const reviews = await Review.find().lean();
  let count = 0;
  for (const r of reviews) {
    await db.execute(
      `REPLACE INTO reviews (mongo_id, user_id, product_id, rating, title, comment, images, is_approved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r._id.toString(), r.user?.toString() || null, r.product?.toString() || null,
        r.rating, r.title || null, r.comment, toJSON(r.images),
        r.isApproved || false, toDatetime(r.createdAt), toDatetime(r.updatedAt),
      ]
    );
    count++;
  }
  return count;
}

async function syncContacts(db) {
  const contacts = await Contact.find().lean();
  let count = 0;
  for (const c of contacts) {
    await db.execute(
      `REPLACE INTO contacts (mongo_id, name, email, subject, message, is_resolved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c._id.toString(), c.name, c.email, c.subject, c.message,
        c.isResolved || false, toDatetime(c.createdAt), toDatetime(c.updatedAt),
      ]
    );
    count++;
  }
  return count;
}

async function syncAbout(db) {
  const about = await About.findOne().lean();
  if (!about) return 0;
  await db.execute(
    `REPLACE INTO about (mongo_id, company_name, tagline, story, mission, vision, founded_year, cover_image, team, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      about._id.toString(), about.companyName, about.tagline,
      about.story || null, about.mission || null, about.vision || null,
      about.foundedYear, toJSON(about.coverImage), toJSON(about.team),
      toDatetime(about.createdAt), toDatetime(about.updatedAt),
    ]
  );
  return 1;
}

async function syncCarts(db) {
  const carts = await Cart.find().lean();
  let count = 0;
  for (const c of carts) {
    await db.execute(
      `REPLACE INTO carts (mongo_id, user_id, items, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        c._id.toString(), c.user?.toString() || null, toJSON(c.items),
        toDatetime(c.createdAt), toDatetime(c.updatedAt),
      ]
    );
    count++;
  }
  return count;
}

// ── Main ────────────────────────────────────────────────────────

async function runBackup() {
  console.log('═══════════════════════════════════════════');
  console.log('  MongoDB → MySQL Backup Sync');
  console.log(`  Started: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════\n');

  await connectDB();
  const db = await initMySQL();

  const results = {};

  const syncTasks = [
    { name: 'Users', fn: () => syncUsers(db) },
    { name: 'Products', fn: () => syncProducts(db) },
    { name: 'Orders', fn: () => syncOrders(db) },
    { name: 'Categories', fn: () => syncCategories(db) },
    { name: 'Coupons', fn: () => syncCoupons(db) },
    { name: 'Reviews', fn: () => syncReviews(db) },
    { name: 'Contacts', fn: () => syncContacts(db) },
    { name: 'About', fn: () => syncAbout(db) },
    { name: 'Carts', fn: () => syncCarts(db) },
  ];

  for (const task of syncTasks) {
    try {
      const count = await task.fn();
      results[task.name] = { status: 'OK', count };
      console.log(`  ✓ ${task.name}: ${count} records synced`);
    } catch (err) {
      results[task.name] = { status: 'FAILED', error: err.message };
      console.error(`  ✗ ${task.name}: FAILED — ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Backup Complete!');
  console.log('═══════════════════════════════════════════\n');

  await getPool().end();
  await mongoose.disconnect();
  process.exit(0);
}

runBackup().catch((err) => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
