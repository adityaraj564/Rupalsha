/**
 * Centralized upload-error middleware shared across all routers that
 * accept multipart/form-data file uploads.
 *
 * Converts well-known multer / Cloudinary failures into structured
 * 4xx JSON responses so clients always receive a clean, actionable
 * error instead of a generic 500 "Internal Server Error".
 *
 * Attach near the bottom of a router (just before `module.exports`).
 *
 *   const { uploadErrorHandler } = require('../utils/uploadError');
 *   router.use(uploadErrorHandler('reviews'));
 *
 * @param {string} [tag]  Short label included in server logs.
 */
function uploadErrorHandler(tag = 'upload') {
  return function (err, req, res, next) {
    if (!err) return next();
    const msg = err.message || 'Upload failed';

    // Multer errors: body parser / size limit / unexpected field
    if (err.name === 'MulterError') {
      let friendly = msg;
      if (err.code === 'LIMIT_FILE_SIZE') {
        friendly = 'Image is too large. Maximum allowed size is 5 MB.';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        friendly = 'Unexpected file field.';
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        friendly = 'Too many files uploaded.';
      }
      console.warn(`[${tag}] multer error:`, err.code, err.field || '', '-', msg);
      return res.status(400).json({ success: false, error: friendly, code: err.code });
    }

    // Custom file-filter rejections
    if (err.code === 'INVALID_FILE_TYPE') {
      console.warn(`[${tag}] invalid file type:`, msg);
      return res.status(400).json({ success: false, error: msg, code: err.code });
    }

    // Cloudinary upstream errors (network, quota, transformation)
    if (err.http_code || /cloudinary|allowed_formats|invalid image|format/i.test(msg)) {
      console.error(`[${tag}] cloudinary error:`, err.http_code || '', '-', msg);
      const status = err.http_code && err.http_code < 500 ? 400 : 502;
      return res.status(status).json({
        success: false,
        error: 'Image upload failed. Please try again with a different image.',
      });
    }

    next(err);
  };
}

/**
 * Tiny helper: wrap a multer middleware so its sync/async errors flow
 * through `next(err)` instead of leaking unhandled to the client.
 */
function runUpload(mw) {
  return (req, res, next) =>
    mw(req, res, (err) => (err ? next(err) : next()));
}

module.exports = { uploadErrorHandler, runUpload };
