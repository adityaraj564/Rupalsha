require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Safety: prevent running on production database
if (process.env.NODE_ENV === 'production' || (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('_prod'))) {
  console.error('\n❌ ABORT: Cannot run seed script on production database!\n');
  process.exit(1);
}

const demoHighlights = [
  { key: 'Base Material', value: 'Brass, Copper' },
  { key: 'Color', value: 'Gold' },
  { key: 'Plating', value: 'Gold-plated' },
  { key: 'Occasion', value: 'Everyday, Love, Party, Religious, Wedding & Engagement, Workwear' },
];

const demoSpecifications = [
  {
    group: 'General',
    fields: [
      { key: 'Brand', value: 'NAKMAN JEWELLERY' },
      { key: 'Model Number', value: 'Arf-Circle-Set-101' },
      { key: 'Base Material', value: 'Brass, Copper' },
      { key: 'Color', value: 'Gold' },
      { key: 'Type', value: 'Earring & Necklace Set' },
      { key: 'Ideal For', value: 'Women, Girls' },
      { key: 'Plating', value: 'Gold-plated' },
      { key: 'Net Quantity', value: '1' },
      { key: 'Brand Color', value: 'NA' },
      { key: 'Earring Type', value: 'Stud Earring' },
      { key: 'Kamarband', value: 'No' },
      { key: 'Maang Tikka', value: 'No' },
      { key: 'Necklace & Chain Type', value: 'Layered Necklace' },
      { key: 'Necklace Clasp Type', value: 'None' },
      { key: 'Payal', value: 'No' },
      { key: 'Pendant Shape', value: 'Moon' },
      { key: 'Trend', value: 'Handcrafted' },
    ],
  },
  {
    group: 'Product Details',
    fields: [
      { key: 'Sales Package', value: '1 Necklace, 2 Earrings' },
      { key: 'Collection', value: 'Ethnic' },
      { key: 'Occasion', value: 'Everyday, Love, Party, Religious, Wedding & Engagement, Workwear' },
      { key: 'Finish', value: 'Glossy' },
      { key: 'Weight', value: '40 g' },
      { key: 'Other Features', value: 'Daily Wear, Wedding Wear' },
      { key: 'Earring Clasp Type', value: 'None' },
      { key: 'Earring Length', value: 'Med (Ear lobe size)' },
    ],
  },
];

const seedHighlights = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rupalsha');
    console.log('Connected to MongoDB');

    // Find first few jewellery-related products and add demo data
    const products = await Product.find({ isActive: true }).limit(3);

    if (products.length === 0) {
      console.log('No products found in database. Please seed products first.');
      process.exit(0);
    }

    for (const product of products) {
      product.highlights = demoHighlights;
      product.specifications = demoSpecifications;
      await product.save();
      console.log(`✅ Added highlights & specifications to: ${product.name} (${product.slug})`);
    }

    console.log(`\nDone! Updated ${products.length} product(s) with demo highlights & specifications.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seedHighlights();
