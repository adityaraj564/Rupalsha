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

// =====================================================================
// BANNER UPLOAD PIPELINE (optimized for hero banners on the home page)
// =====================================================================
// Strategy:
//  - multer-storage-cloudinary streams the file straight to Cloudinary
//    (no double upload, no temp disk, stateless / horizontally scalable).
//  - Eager transformation 1920x600 with c_fill + g_auto produces a
//    correctly-cropped banner regardless of the source aspect ratio.
//  - format webp + q_auto:good keeps banners visually sharp while
//    typically delivering files in the 80-250 KB range.
//  - Strict mime + extension whitelist + 5 MB cap defends against
//    malicious or oversized uploads.
const IMAGE_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const IMAGE_ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

// Shared strict image filter used by every optimized pipeline below.
// Defense-in-depth: validates BOTH mimetype AND original extension to
// frustrate spoofed-MIME uploads.
function makeStrictImageFilter() {
  return (req, file, cb) => {
    const mt = (file.mimetype || '').toLowerCase();
    const name = file.originalname || '';
    if (!IMAGE_ALLOWED_MIME.has(mt) || !IMAGE_ALLOWED_EXT.test(name)) {
      const err = new Error(
        'Invalid image type. Allowed formats: JPG, JPEG, PNG, WEBP.',
      );
      err.code = 'INVALID_FILE_TYPE';
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  };
}

/**
 * Build a hardened image uploader.
 *
 * @param {Object} cfg
 * @param {string} cfg.folder       Cloudinary folder (e.g. 'rupalsha/blogs')
 * @param {Array}  cfg.transformation Cloudinary transform array
 * @param {number} [cfg.maxSize=5MB]  Hard size cap in bytes
 * @returns {import('multer').Multer}
 */
function buildOptimizedImageUploader({ folder, transformation, maxSize = 5 * 1024 * 1024 }) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      format: 'webp', // always store as WebP for best size/quality
      transformation,
    },
  });
  return multer({
    storage,
    fileFilter: makeStrictImageFilter(),
    limits: { fileSize: maxSize },
  });
}

const bannersOptimized = buildOptimizedImageUploader({
  folder: 'rupalsha/banners',
  transformation: [
    {
      width: 1920,
      height: 600,
      crop: 'fill',
      gravity: 'auto', // smart subject-aware cropping
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
});

// Dual-field banner uploader: accepts a desktop `image` (1920x600 landscape)
// and an optional mobile `mobileImage` (750x1000 portrait). The transform is
// chosen at upload time based on `file.fieldname`, so each variant is stored
// pre-cropped at the right aspect ratio — no stretching / cropping in the
// browser regardless of source image proportions.
const bannersDualStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isMobile = file.fieldname === 'mobileImage';
    return {
      folder: 'rupalsha/banners',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      format: 'webp',
      transformation: isMobile
        ? [
            {
              width: 750,
              height: 1000,
              crop: 'fill',
              gravity: 'auto',
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ]
        : [
            {
              width: 1920,
              height: 600,
              crop: 'fill',
              gravity: 'auto',
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ],
    };
  },
});
const bannersDualOptimized = multer({
  storage: bannersDualStorage,
  fileFilter: makeStrictImageFilter(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Categories: 3:4 portrait card on home (600x800 fill, smart crop)
const categoriesOptimized = buildOptimizedImageUploader({
  folder: 'rupalsha/categories',
  transformation: [
    {
      width: 600,
      height: 800,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
});

// Blogs: 16:9 cover (rendered with aspect-video on the frontend)
const blogsOptimized = buildOptimizedImageUploader({
  folder: 'rupalsha/blogs',
  transformation: [
    {
      width: 1600,
      height: 900,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
});

// About: cover hero (wide), team avatars (face-aware square)
const aboutCoverOptimized = buildOptimizedImageUploader({
  folder: 'rupalsha/about/covers',
  transformation: [
    {
      width: 1920,
      height: 800,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
});

// About: portrait mobile cover. 4:5 keeps the subject prominent on
// phones without becoming a tiny letterboxed strip cropped from a
// 1920x800 wide image.
const aboutCoverMobileOptimized = buildOptimizedImageUploader({
  folder: 'rupalsha/about/covers',
  transformation: [
    {
      width: 800,
      height: 1000,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
});

const aboutTeamOptimized = buildOptimizedImageUploader({
  folder: 'rupalsha/about/team',
  transformation: [
    {
      width: 512,
      height: 512,
      crop: 'fill',
      gravity: 'face', // keep faces centered
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
  maxSize: 3 * 1024 * 1024,
});

// Reviews: user-uploaded photos. Don't crop (keep full subject) but cap
// the longest edge so we don't store needlessly huge originals.
const reviewsOptimized = buildOptimizedImageUploader({
  folder: 'rupalsha/reviews',
  transformation: [
    {
      width: 1600,
      height: 1600,
      crop: 'limit',
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
});

module.exports = {
  create: createUploader,
  products: createUploader('products'),
  productMedia, // images + videos with smart compression
  categories: createUploader('categories'),
  categoriesOptimized,
  banners: createUploader('banners'),
  bannersOptimized,
  bannersDualOptimized,
  blogs: createUploader('blogs'),
  blogsOptimized,
  about: createUploader('about'),
  aboutCoverOptimized,
  aboutCoverMobileOptimized,
  aboutTeamOptimized,
  reviews: createUploader('reviews'),
  reviewsOptimized,
  misc: createUploader('misc'),
};
