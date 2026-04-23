const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Images only (videos removed).
const returnEvidenceStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'rupalsha/returns/images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
  cb(null, true);
};

const returnUpload = multer({
  storage: returnEvidenceStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
});

module.exports = returnUpload;
