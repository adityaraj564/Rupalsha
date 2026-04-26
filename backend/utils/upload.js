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
// - Images: cap at 2000x2500 (no upscale) with quality:auto:good + auto format
//   so visual quality is preserved while file size shrinks at upload time.
// - Videos: stored as-is; compression happens at delivery time via Cloudinary
//   URL transforms (q_auto,f_auto). Doing transforms at upload time triggers an
//   "eager" synchronous re-encode that easily exceeds the request timeout.
const productMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: (req, file) =>
      (file.mimetype || '').startsWith('video/')
        ? 'rupalsha/products/videos'
        : 'rupalsha/products/images',
    resource_type: (req, file) =>
      (file.mimetype || '').startsWith('video/') ? 'video' : 'image',
    allowed_formats: (req, file) =>
      (file.mimetype || '').startsWith('video/')
        ? ['mp4', 'mov', 'webm', 'm4v', 'mkv']
        : ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: (req, file) =>
      (file.mimetype || '').startsWith('video/')
        ? undefined // skip eager transform for videos
        : [
            {
              width: 2000,
              height: 2500,
              crop: 'limit',
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ],
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
