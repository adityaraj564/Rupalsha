require('dotenv').config();
const mongoose = require('mongoose');
const Banner = require('../models/Banner');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rupalsha');
  console.log('Connected to DB');

  const banners = [
    {
      image: { url: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=1920&q=80', public_id: 'dev_banner_1' },
      title: 'Exquisite Gold Collection',
      link: '/products?featured=true',
      isActive: true,
      order: 0,
    },
    {
      image: { url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1920&q=80', public_id: 'dev_banner_2' },
      title: 'New Bangle Arrivals — Flat 10% Off',
      link: '/products?category=bangles',
      isActive: true,
      order: 1,
    },
    {
      image: { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1920&q=80', public_id: 'dev_banner_3' },
      title: 'Handcrafted Earrings for Every Occasion',
      link: '/products?category=earrings',
      isActive: true,
      order: 2,
    },
  ];

  await Banner.deleteMany({});
  const created = await Banner.insertMany(banners);
  console.log('Seeded ' + created.length + ' banners');
  await mongoose.disconnect();
})();
