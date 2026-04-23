const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Dynamic storage: images → image resource, videos → video resource.
const returnEvidenceStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    if (isVideo) {
      return {
        folder: 'rupalsha/returns/videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'webm', 'avi', 'mkv'],
      };
    }
    return {
      folder: 'rupalsha/returns/images',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'images') {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed for images field'));
  } else if (file.fieldname === 'video') {
    if (!file.mimetype.startsWith('video/')) return cb(new Error('Only video files allowed for video field'));
  }
  cb(null, true);
};

// Per-file size limits. Video duration (≤30s) is enforced server-side post-upload
// by inspecting the Cloudinary response (set on req.files[i].duration via multer-storage-cloudinary).
const returnUpload = multer({
  storage: returnEvidenceStorage,
  fileFilter,
  limits: {
    fileSize: 60 * 1024 * 1024, // 60MB per file (allows ~30s video)
  },
});

module.exports = returnUpload;
