const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { registerJobHandlers, startInProcessWorkers } = require('./utils/queueWorkers');

// Register queue job handlers BEFORE any route uses them. Safe whether or
// not Redis is configured — when it isn't, handlers run inline (current
// behaviour preserved exactly).
registerJobHandlers();

const app = express();

// Trust proxy (Render, Heroku, etc. use reverse proxies)
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// Compression - gzip responses (reduces transfer size ~70%)
app.use(compression());

// Security middleware
app.use(helmet());

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
];
// Also allow www variant of the frontend URL
if (process.env.FRONTEND_URL) {
  const url = new URL(process.env.FRONTEND_URL);
  allowedOrigins.push(`${url.protocol}//www.${url.host}`);
}
// In development, allow localhost and tunnel URLs
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
}

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.some(u => origin.startsWith(u)) || (process.env.NODE_ENV !== 'production' && origin.endsWith('.loca.lt'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Rate limit for contact form
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many messages sent. Please try again later.' },
});
app.use('/api/contact', contactLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP cache headers for public read endpoints ──
// Browsers and CDNs can serve these from their own cache, slashing latency
// for repeat visits. Only applies to GET requests with no Authorization
// header (so personalised data is never cached). Mutations skip via method
// check; routes that handle auth-aware logic should set their own Cache-
// Control to override (e.g. /products may differ for logged-in vs guest).
const PUBLIC_CACHEABLE_PATHS = [
  '/api/products',
  '/api/categories',
  '/api/banners',
  '/api/blogs',
  '/api/faqs',
  '/api/pages',
  '/api/about',
  '/api/coupons/active',
];
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.headers.authorization) return next();
  const matches = PUBLIC_CACHEABLE_PATHS.some((p) => req.path === p || req.path.startsWith(p + '/'));
  if (matches) {
    // 60s fresh, 5min stale-while-revalidate – matches the client SWR TTLs.
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/returns', require('./routes/returns'));
const walletRoutes = require('./routes/wallet');
app.use('/api/wallet', walletRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/users', require('./routes/users'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/about', require('./routes/about'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/faqs', require('./routes/faqs'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/content-admin', require('./routes/content-admin'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Disable X-Powered-By (defense in depth, helmet also does this)
app.disable('x-powered-by');

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  // Boot in-process BullMQ workers when Redis is enabled. No-op otherwise,
  // so deployments without REDIS_URL keep behaving exactly as today.
  try {
    startInProcessWorkers();
  } catch (err) {
    // Never let worker boot kill the API.
    console.error('[queue] failed to start in-process workers:', err.message);
  }
});

// Sweep stale pending wallet recharges every 10 minutes (expires any > 2h old).
setInterval(() => {
  if (walletRoutes && typeof walletRoutes.expireStalePendingRecharges === 'function') {
    walletRoutes.expireStalePendingRecharges().catch((err) => {
      console.error('[wallet sweep] failed:', err.message);
    });
  }
}, 10 * 60 * 1000);

module.exports = app;
