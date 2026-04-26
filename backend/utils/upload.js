const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Factory: build a multer instance whose CloudinaryStorage uploads into
// `rupalsha/<subFolder>` so assets are organised by domain.
function createUploader(subFolder, opts = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    transformation = [{ width: 1200, height: 1500, crop: 'limit', quality: 'auto' }],
    allowed_formats = ['jpg', 'jpeg', 'png', 'webp'],
  } = opts;

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `rupalsha/${subFolder}`,
      allowed_formats,
      transformation,
    },
  });

  return multer({ storage, limits: { fileSize: maxSize } });
}

module.exports = {
  create: createUploader,
  products: createUploader('products'),
  categories: createUploader('categories'),
  banners: createUploader('banners'),
  blogs: createUploader('blogs'),
  about: createUploader('about'),
  reviews: createUploader('reviews'),
  misc: createUploader('misc'),
};
