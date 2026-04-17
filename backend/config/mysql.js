const mysql = require('mysql2/promise');

let pool = null;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'rupalsha_backup',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
};

const initMySQL = async () => {
  const db = getPool();

  // Create tables if they don't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      mongo_id VARCHAR(24) PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(15),
      role VARCHAR(10) DEFAULT 'user',
      is_blocked BOOLEAN DEFAULT FALSE,
      addresses JSON,
      wishlist JSON,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      mongo_id VARCHAR(24) PRIMARY KEY,
      name VARCHAR(200),
      slug VARCHAR(300),
      description TEXT,
      price DECIMAL(10,2),
      compare_price DECIMAL(10,2),
      category VARCHAR(100),
      subcategory VARCHAR(100),
      child_category VARCHAR(100),
      product_code VARCHAR(10),
      sku VARCHAR(50),
      shipping_charge DECIMAL(10,2) DEFAULT 0,
      low_stock_threshold INT DEFAULT 5,
      images JSON,
      sizes JSON,
      colors JSON,
      fabric VARCHAR(100),
      care_instructions TEXT,
      tags JSON,
      average_rating DECIMAL(3,1) DEFAULT 0,
      num_reviews INT DEFAULT 0,
      is_featured BOOLEAN DEFAULT FALSE,
      is_trending BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      is_returnable BOOLEAN DEFAULT TRUE,
      return_policy TEXT,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      mongo_id VARCHAR(24) PRIMARY KEY,
      user_id VARCHAR(24),
      order_number VARCHAR(50),
      items JSON,
      shipping_address JSON,
      payment_method VARCHAR(20),
      payment_result JSON,
      items_total DECIMAL(10,2),
      shipping_charge DECIMAL(10,2) DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      coupon_code VARCHAR(50),
      total_amount DECIMAL(10,2),
      is_paid BOOLEAN DEFAULT FALSE,
      paid_at DATETIME,
      status VARCHAR(20) DEFAULT 'pending',
      tracking_number VARCHAR(100),
      delivered_at DATETIME,
      cancel_reason TEXT,
      return_reason TEXT,
      notes TEXT,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      mongo_id VARCHAR(24) PRIMARY KEY,
      name VARCHAR(100),
      slug VARCHAR(150),
      parent_id VARCHAR(24),
      level INT,
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      mongo_id VARCHAR(24) PRIMARY KEY,
      code VARCHAR(50),
      description TEXT,
      discount_type VARCHAR(20),
      discount_value DECIMAL(10,2),
      min_order_amount DECIMAL(10,2) DEFAULT 0,
      max_discount DECIMAL(10,2),
      usage_limit INT,
      used_count INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      expires_at DATETIME,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      mongo_id VARCHAR(24) PRIMARY KEY,
      user_id VARCHAR(24),
      product_id VARCHAR(24),
      rating INT,
      title VARCHAR(200),
      comment TEXT,
      images JSON,
      is_approved BOOLEAN DEFAULT FALSE,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      mongo_id VARCHAR(24) PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(255),
      subject VARCHAR(255),
      message TEXT,
      is_resolved BOOLEAN DEFAULT FALSE,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS about (
      mongo_id VARCHAR(24) PRIMARY KEY,
      company_name VARCHAR(100),
      tagline VARCHAR(255),
      story TEXT,
      mission TEXT,
      vision TEXT,
      founded_year INT,
      cover_image JSON,
      team JSON,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS carts (
      mongo_id VARCHAR(24) PRIMARY KEY,
      user_id VARCHAR(24),
      items JSON,
      created_at DATETIME,
      updated_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('MySQL backup tables initialized.');
  return db;
};

module.exports = { getPool, initMySQL };
