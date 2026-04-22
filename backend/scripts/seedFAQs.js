require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const FAQ = require('../models/FAQ');

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

async function seed() {
  await connectDB();
  
  const count = await FAQ.countDocuments();
  if (count > 0) {
    console.log(`Already have ${count} FAQs. Skipping seed.`);
    process.exit(0);
  }

  await FAQ.insertMany(FAQS);
  console.log(`Seeded ${FAQS.length} FAQs`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
