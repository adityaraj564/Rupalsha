require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const found = await User.findOne({ email: 'contentadmin@rupalsha.com' }).select('+password');
  if (!found) { console.log('Not found'); process.exit(1); }
  found.password = 'SubAdmin@123';
  await found.save();
  console.log('Password reset for contentadmin@rupalsha.com');
  process.exit(0);
})();
