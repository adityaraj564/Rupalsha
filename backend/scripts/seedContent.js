/**
 * Seed FAQs + Page Content into MongoDB
 * Run: node scripts/seedContent.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const FAQ = require('../models/FAQ');
const PageContent = require('../models/PageContent');

const FAQS = [
  {
    question: 'How long does delivery take?',
    answer: 'Standard delivery takes 5-7 business days across India. Metro cities may receive orders in 3-5 days.',
    category: 'Shipping',
    sortOrder: 1,
  },
  {
    question: 'What is your return policy?',
    answer: 'Our return policy varies from product to product — the return window (number of days) is mentioned on each product page. Products must be unused, unwashed, and with original tags attached. Intimates and accessories are non-returnable. Recording an unboxing video while opening the package is mandatory for all return claims.',
    category: 'Returns',
    sortOrder: 2,
  },
  {
    question: 'How do I track my order?',
    answer: 'Once your order is shipped, you will receive a tracking number via email and SMS. You can also track your order from the "My Orders" section.',
    category: 'Orders',
    sortOrder: 3,
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards, net banking, and Cash on Delivery (COD).',
    category: 'Payment',
    sortOrder: 4,
  },
  {
    question: 'Can I cancel my order?',
    answer: 'Yes, you can cancel your order before it is shipped. Go to "My Orders" and click on "Cancel Order". Once shipped, the order cannot be cancelled.',
    category: 'Orders',
    sortOrder: 5,
  },
  {
    question: 'How do I exchange a product?',
    answer: 'Currently we offer returns only. You can return the product and place a new order for the desired item.',
    category: 'Returns',
    sortOrder: 6,
  },
  {
    question: 'Are the product images accurate?',
    answer: 'We try our best to present accurate colors and details. However, slight variations may occur due to screen settings and lighting during photography.',
    category: 'Products',
    sortOrder: 7,
  },
  {
    question: 'Do you offer COD?',
    answer: 'Yes, Cash on Delivery is available across India for orders up to ₹10,000.',
    category: 'Payment',
    sortOrder: 8,
  },
];

const PAGES = [
  {
    pageKey: 'shipping',
    title: 'Shipping Information',
    content: '<p>We ship across India via trusted courier partners.</p><ul><li>Standard delivery: 5-7 business days</li><li>Metro cities: 3-5 business days</li><li>Free shipping on orders above ₹999</li><li>Shipping charges vary by product</li></ul>',
  },
  {
    pageKey: 'returns',
    title: 'Returns & Exchange',
    content: '<p>We want you to love what you buy. If not, returns are easy!</p><ul><li>Return window varies per product (check the product page for exact days)</li><li>Products must be unused with original tags</li><li>Refund processed within 5-7 business days</li><li>Intimates and accessories are non-returnable</li></ul><div class="warning"><p><strong>⚠️ Mandatory: Unboxing Video Required</strong></p><p>You must record a video while opening your package. This unboxing video is mandatory for processing any return or exchange request. Claims without an unboxing video will not be accepted.</p></div>',
  },
  {
    pageKey: 'contact',
    title: 'Contact Us',
    content: '<p>Our support team is available Monday to Saturday, 10 AM to 6 PM IST.</p>',
    contactEmail: 'support@rupalsha.com',
    contactPhone: '+91 79798 04477',
    supportHours: 'Monday to Saturday, 10 AM to 6 PM IST',
  },
  {
    pageKey: 'privacy',
    title: 'Privacy Policy',
    content: '<p>We respect your privacy and are committed to protecting your personal data.</p><p>We collect only necessary information for order processing and improving your experience. Your data is never sold to third parties.</p>',
  },
  {
    pageKey: 'terms',
    title: 'Terms of Service',
    content: '<p>By using Rupalsha, you agree to our terms of service.</p><p>All products are subject to availability. Prices are in INR and inclusive of taxes. For complete terms, please contact our support team.</p>',
  },
  {
    pageKey: 'special-offer',
    title: 'Special Offer',
    content: 'Valid on all products.',
    offerHeading: 'Get 10% Off Your First Order',
    offerCode: 'RUP10',
    offerDescription: 'at checkout',
    offerLink: '/products',
    offerImage: 'https://images.unsplash.com/photo-1515562141589-67f0d569b5e9?w=1200',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rupalsha');
    console.log('Connected to MongoDB');

    // Seed FAQs — drop old and insert fresh
    await FAQ.deleteMany({});
    const faqs = await FAQ.insertMany(FAQS);
    console.log(`✅ Seeded ${faqs.length} FAQs`);

    // Seed Page Content — upsert each page
    for (const page of PAGES) {
      await PageContent.findOneAndUpdate(
        { pageKey: page.pageKey },
        page,
        { upsert: true, new: true, runValidators: true }
      );
    }
    console.log(`✅ Seeded ${PAGES.length} page content entries`);

    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
