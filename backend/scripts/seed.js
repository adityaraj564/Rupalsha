require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');

// Safety: prevent running on production database
if (process.env.NODE_ENV === 'production' || (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('_prod'))) {
  console.error('\n❌ ABORT: Cannot run seed script on production database!\n');
  process.exit(1);
}

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rupalsha');
    console.log('Connected to MongoDB');

    // Create admin user
    const adminExists = await User.findOne({ email: 'rupalshaofficial@gmail.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: 'rupalshaofficial@gmail.com',
        password: 'Rupalsha@@7980',
        role: 'admin',
      });
      console.log('Admin user created: rupalshaofficial@gmail.com');
    }

    // Sample products
    const products = [
      {
        name: 'Ethereal Blush Saree',
        description: 'A stunning blush pink saree with intricate golden embroidery. Perfect for weddings and festive occasions. Made from premium georgette fabric with a luxurious finish.',
        price: 4999,
        comparePrice: 6999,
        category: 'sarees',
        images: [{ url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800', alt: 'Blush Saree' }],
        sizes: [{ size: 'Free Size', stock: 25 }],
        fabric: 'Georgette',
        tags: ['wedding', 'festive', 'pink', 'embroidery'],
        isFeatured: true,
        isTrending: true,
      },
      {
        name: 'Emerald Garden Kurti',
        description: 'An elegant deep green kurti with floral block prints. Comfortable cotton fabric perfect for everyday wear and casual outings.',
        price: 1499,
        comparePrice: 1999,
        category: 'kurtis',
        images: [{ url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', alt: 'Green Kurti' }],
        sizes: [
          { size: 'S', stock: 15 },
          { size: 'M', stock: 20 },
          { size: 'L', stock: 18 },
          { size: 'XL', stock: 10 },
        ],
        fabric: 'Cotton',
        tags: ['casual', 'green', 'floral', 'everyday'],
        isFeatured: true,
      },
      {
        name: 'Royal Midnight Lehenga',
        description: 'A breathtaking midnight blue lehenga with golden zari work and sequin embellishments. The perfect outfit for your special day.',
        price: 12999,
        comparePrice: 18999,
        category: 'lehengas',
        images: [{ url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800', alt: 'Midnight Lehenga' }],
        sizes: [
          { size: 'S', stock: 5 },
          { size: 'M', stock: 8 },
          { size: 'L', stock: 6 },
        ],
        fabric: 'Silk',
        tags: ['wedding', 'bridal', 'blue', 'premium'],
        isFeatured: true,
        isTrending: true,
      },
      {
        name: 'Ivory Lace Dress',
        description: 'A beautiful ivory dress with delicate lace detailing. Perfect for brunches, date nights, and special gatherings.',
        price: 2999,
        comparePrice: 3999,
        category: 'dresses',
        images: [{ url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800', alt: 'Ivory Dress' }],
        sizes: [
          { size: 'XS', stock: 8 },
          { size: 'S', stock: 12 },
          { size: 'M', stock: 15 },
          { size: 'L', stock: 10 },
        ],
        fabric: 'Lace & Crepe',
        tags: ['party', 'ivory', 'lace', 'elegant'],
        isTrending: true,
      },
      {
        name: 'Champagne Silk Top',
        description: 'A luxurious champagne colored silk top with subtle pleating. Pairs beautifully with our palazzo pants or a skirt.',
        price: 1299,
        comparePrice: 1799,
        category: 'tops',
        images: [{ url: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800', alt: 'Champagne Top' }],
        sizes: [
          { size: 'S', stock: 20 },
          { size: 'M', stock: 25 },
          { size: 'L', stock: 18 },
          { size: 'XL', stock: 10 },
        ],
        fabric: 'Silk',
        tags: ['casual', 'silk', 'champagne', 'versatile'],
      },
      {
        name: 'Beige Palazzo Pants',
        description: 'Flowy beige palazzo pants in premium rayon. Ultra comfortable with an elastic waistband. Perfect for pairing with kurtis and tops.',
        price: 999,
        comparePrice: 1499,
        category: 'bottoms',
        images: [{ url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800', alt: 'Palazzo Pants' }],
        sizes: [
          { size: 'S', stock: 30 },
          { size: 'M', stock: 35 },
          { size: 'L', stock: 25 },
          { size: 'XL', stock: 15 },
          { size: 'XXL', stock: 10 },
        ],
        fabric: 'Rayon',
        tags: ['casual', 'comfortable', 'beige', 'everyday'],
      },
      {
        name: 'Golden Thread Dupatta',
        description: 'A stunning golden-threaded dupatta that adds instant elegance to any outfit. Crafted from fine chiffon with detailed border work.',
        price: 799,
        comparePrice: 1199,
        category: 'dupattas',
        images: [{ url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800', alt: 'Golden Dupatta' }],
        sizes: [{ size: 'Free Size', stock: 40 }],
        fabric: 'Chiffon',
        tags: ['accessory', 'golden', 'dupatta', 'festive'],
        isTrending: true,
      },
      {
        name: 'Pearl Statement Earrings',
        description: 'Handcrafted pearl earrings with a contemporary design. Lightweight and perfect for both traditional and modern outfits.',
        price: 599,
        comparePrice: 899,
        category: 'accessories',
        images: [{ url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800', alt: 'Pearl Earrings' }],
        sizes: [{ size: 'Free Size', stock: 50 }],
        tags: ['accessories', 'earrings', 'pearl', 'statement'],
      },
    ];

    const existingCount = await Product.countDocuments();
    if (existingCount === 0) {
      for (const p of products) {
        await Product.create(p);
      }
      console.log(`${products.length} sample products created`);
    } else {
      console.log('Products already exist, skipping seed');
    }

    console.log('Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
