const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rupalsha');
    console.log(`MongoDB Connected: ${conn.connection.host} | DB: ${conn.connection.name} | Env: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
