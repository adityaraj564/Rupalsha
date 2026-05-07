require('dotenv').config();
const mongoose = require('mongoose');
const About = require('../models/About');

const NEW_PROMISES = [
  { icon: 'truck',  label: 'Faster Delivery' },
  { icon: 'heart',  label: 'Hand-picked Designs' },
  { icon: 'shield', label: 'Easy Return' },
  { icon: 'smile',  label: 'Dedicated Support' },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rupalsha');
    console.log('Connected to MongoDB');

    const docs = await About.find({});
    if (!docs.length) {
      console.log('No About document found — creating one with new promises.');
      await About.create({ promises: NEW_PROMISES });
    } else {
      for (const doc of docs) {
        doc.promises = NEW_PROMISES;
        await doc.save();
        console.log(`Updated About ${doc._id}`);
      }
    }
    console.log('Done.');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
