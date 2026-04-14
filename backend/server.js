const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect to Database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://rupalsha-api.loca.lt',
    ];
    if (!origin || allowed.some(u => origin.startsWith(u)) || origin.endsWith('.loca.lt')) {
      callback(null, true);
    } else {
      callback(null, true); // allow all origins for tunnel sharing
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/users', require('./routes/users'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
