const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');

const CATEGORY_TREE = [
  {
    name: 'Accessories', children: [
      { name: 'Jewellery', children: ['Earrings', 'Necklaces', 'Rings', 'Bracelets'] },
      { name: 'Bags', children: ['Handbags', 'Sling Bags', 'Totes'] },
      { name: 'Footwear', children: ['Flats', 'Heels'] },
      { name: 'Other', children: ['Scarves', 'Hair Accessories'] },
    ],
  },
  {
    name: 'Fashion', children: [
      { name: 'Ethnic Wear', children: ['Sarees', 'Kurtis', 'Lehengas'] },
      { name: 'Western Wear', children: ['Dresses', 'Tops', 'Jeans'] },
      { name: 'Innerwear', children: [] },
    ],
  },
  {
    name: 'GenZ', children: [
      { name: 'Trendy Dresses', children: [] },
      { name: 'Streetwear', children: [] },
      { name: 'Minimal Jewellery', children: [] },
    ],
  },
  {
    name: 'Kids', children: [
      { name: 'Clothing', children: [] },
      { name: 'Kids Accessories', children: [] },
    ],
  },
  {
    name: 'Home & Living', children: [
      { name: 'Decor', children: ['Wall Decor', 'Table Decor'] },
      { name: 'Utility', children: [] },
    ],
  },
  {
    name: 'Handcrafted', children: [
      { name: 'Handmade Jewellery', children: [] },
      { name: 'Crochet Products', children: [] },
      { name: 'Artisan Products', children: [] },
    ],
  },
];

async function seedCategories() {
  await connectDB();

  // Remove existing categories
  await Category.deleteMany({});
  console.log('Cleared existing categories');

  let sortOrder = 0;
  for (const main of CATEGORY_TREE) {
    const mainCat = await Category.create({
      name: main.name,
      parent: null,
      level: 0,
      sortOrder: sortOrder++,
    });
    console.log(`Created main: ${main.name}`);

    for (const sub of main.children) {
      const subName = typeof sub === 'string' ? sub : sub.name;
      const subChildren = typeof sub === 'string' ? [] : sub.children;

      const subCat = await Category.create({
        name: subName,
        parent: mainCat._id,
        level: 1,
        sortOrder: sortOrder++,
      });
      console.log(`  Created sub: ${subName}`);

      for (const child of subChildren) {
        const childName = typeof child === 'string' ? child : child.name;
        await Category.create({
          name: childName,
          parent: subCat._id,
          level: 2,
          sortOrder: sortOrder++,
        });
        console.log(`    Created child: ${childName}`);
      }
    }
  }

  console.log('\nCategory seeding complete!');
  const count = await Category.countDocuments();
  console.log(`Total categories: ${count}`);
  process.exit(0);
}

seedCategories().catch(err => {
  console.error(err);
  process.exit(1);
});
