require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  let found = await User.findOne({ email: 'contentadmin@rupalsha.com' }).select('+password');
  if (!found) {
    found = new User({
      name: 'Content Admin',
      email: 'contentadmin@rupalsha.com',
      role: 'contentadmin',
    });
    console.log('Creating content admin user...');
  } else {
    console.log('Content admin user found, resetting password...');
  }
  found.password = 'SubAdmin@123';
  await found.save();
  console.log('✅ contentadmin@rupalsha.com ready (role: contentadmin, password: SubAdmin@123)');
  process.exit(0);
})();
