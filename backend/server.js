const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy (Render, Heroku, etc. use reverse proxies)
app.set('trust proxy', 1);

// Connect to Database
connectDB();

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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/users', require('./routes/users'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/about', require('./routes/about'));
app.use('/api/admin', require('./routes/admin'));

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
});

module.exports = app;
