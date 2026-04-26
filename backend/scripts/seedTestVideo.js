/**
 * Dev-only: attach a test image + video to the first product so the new
 * video uploader / player can be verified end-to-end.
 *
 * Usage:  node backend/scripts/seedTestVideo.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const cloudinary = require('../config/cloudinary');
const Product = require('../models/Product');

// Safety: don't touch prod
if (
  process.env.NODE_ENV === 'production' ||
  (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('_prod'))
) {
  console.error('\n❌ ABORT: refusing to run on production database\n');
  process.exit(1);
}

// Cloudinary's own demo assets — always available, no API call needed for URLs,
// but we still re-upload into our `rupalsha/products/...` folders so the
// public_id matches our schema (and so they're easy to delete later).
const SAMPLE_IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
const SAMPLE_VIDEO_URL =
  'https://res.cloudinary.com/demo/video/upload/dog.mp4';

async function main() {
  await connectDB();

  const product = await Product.findOne().sort({ createdAt: 1 });
  if (!product) {
    console.error('No products in DB — create one first.');
    process.exit(1);
  }

  console.log(`→ Target product: ${product.name} (${product._id})`);

  console.log('→ Uploading sample image to Cloudinary…');
  const img = await cloudinary.uploader.upload(SAMPLE_IMAGE_URL, {
    folder: 'rupalsha/products/images',
    resource_type: 'image',
    transformation: [
      { width: 2000, height: 2500, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
    ],
  });

  console.log('→ Uploading sample video to Cloudinary…');
  const vid = await cloudinary.uploader.upload(SAMPLE_VIDEO_URL, {
    folder: 'rupalsha/products/videos',
    resource_type: 'video',
    transformation: [
      { quality: 'auto:good', video_codec: 'auto', fetch_format: 'auto' },
    ],
  });

  product.images = [
    ...(product.images || []),
    { url: img.secure_url, public_id: img.public_id, alt: 'test sample' },
  ];
  product.videos = [
    ...(product.videos || []),
    {
      url: vid.secure_url,
      public_id: vid.public_id,
      thumbnail: cloudinary.url(vid.public_id, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [{ width: 600, crop: 'fill' }],
      }),
    },
  ];

  await product.save();

  console.log('\n✅ Done. Attached:');
  console.log('   image →', img.secure_url);
  console.log('   video →', vid.secure_url);
  console.log(`\nOpen /product/${product.slug || product._id} to verify.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
