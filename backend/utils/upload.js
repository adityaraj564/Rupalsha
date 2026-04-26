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

// Product-specific uploader that accepts BOTH images and videos.
// - Per-file size cap: 50MB (covers high-quality short product videos)
// - Images: cap at 2000x2500 (no upscale) with quality:auto:good + auto format (AVIF/WebP)
//   so visual quality is preserved while file size shrinks.
// - Videos: Cloudinary re-encodes with quality:auto:good + auto codec/format,
//   keeping resolution intact and producing a much smaller file with no visible loss.
const productMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = (file.mimetype || '').startsWith('video/');
    if (isVideo) {
      return {
        folder: 'rupalsha/products/videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'webm', 'm4v', 'mkv'],
        transformation: [
          { quality: 'auto:good', video_codec: 'auto', fetch_format: 'auto' },
        ],
      };
    }
    return {
      folder: 'rupalsha/products/images',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [
        { width: 2000, height: 2500, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
      ],
    };
  },
});

const productMediaFilter = (req, file, cb) => {
  const mt = file.mimetype || '';
  if (mt.startsWith('image/') || mt.startsWith('video/')) return cb(null, true);
  cb(new Error('Only image or video files are allowed'));
};

const productMedia = multer({
  storage: productMediaStorage,
  fileFilter: productMediaFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
});

module.exports = {
  create: createUploader,
  products: createUploader('products'),
  productMedia, // images + videos with smart compression
  categories: createUploader('categories'),
  banners: createUploader('banners'),
  blogs: createUploader('blogs'),
  about: createUploader('about'),
  reviews: createUploader('reviews'),
  misc: createUploader('misc'),
};
