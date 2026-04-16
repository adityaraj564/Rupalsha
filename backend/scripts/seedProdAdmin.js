// One-time script to create admin user in production database
// Usage: node scripts/seedProdAdmin.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to PROD DB:', mongoose.connection.name);

  const exists = await User.findOne({ email: 'rupalshaofficial@gmail.com' });
  if (!exists) {
    await User.create({
      name: 'Admin',
      email: 'rupalshaofficial@gmail.com',
      password: 'Rupalsha@@7980',
      role: 'admin',
    });
    console.log('Admin user created in production');
  } else {
    console.log('Admin user already exists in production');
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
