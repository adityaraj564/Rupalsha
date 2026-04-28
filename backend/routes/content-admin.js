const express = require('express');
const Banner = require('../models/Banner');
const { subAdminAuth } = require('../middleware/auth');
const uploaders = require('../utils/upload');
const uploadBanner = uploaders.bannersOptimized;
const uploadMisc = uploaders.misc;
const cloudinary = require('../config/cloudinary');
const cache = require('../utils/cache');
const { logActivity } = require('../utils/activityLog');
const { uploadErrorHandler, runUpload } = require('../utils/uploadError');

const router = express.Router();

// All routes require subAdmin or admin auth
router.use(subAdminAuth);

// POST /api/content-admin/upload-image
// Generic image uploader for content sections (special-offer banner, hero, etc.)
// Returns { url, public_id }. Use the returned url in the relevant content field.
router.post('/upload-image', runUpload(uploadMisc.single('image')), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Image is required' });
  // multer-storage-cloudinary has already streamed the file to Cloudinary.
  // req.file.path = secure_url, req.file.filename = public_id.
  res.json({ success: true, url: req.file.path, public_id: req.file.filename });
});

// GET /api/content-admin/banners
router.get('/banners', async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json(banners);
  } catch (err) { next(err); }
});

// POST /api/content-admin/banners
// Robust banner upload pipeline:
//  - Strict mime + extension validation (JPG/PNG/WEBP only)
//  - 5MB hard cap (multer)
//  - Eager Cloudinary transform to 1920x600 WebP (smart crop, q_auto)
//  - Single direct-to-Cloudinary upload (no double upload, stateless)
router.post('/banners', runUpload(uploadBanner.single('image')), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image is required' });
    }

    // Sanitize text fields (trim + length cap, drop anything weird).
    const title = String(req.body.title || '').trim().slice(0, 200);
    const link = String(req.body.link || '').trim().slice(0, 500);

    const count = await Banner.countDocuments();
    const banner = await Banner.create({
      image: { url: req.file.path, public_id: req.file.filename },
      title,
      link,
      order: count,
    });

    cache.clear('banners');
    logActivity({
      action: 'create',
      section: 'banner',
      description: `Created banner: ${banner.title || 'Untitled'}`,
      user: req.user,
    });

    res.status(201).json({
      success: true,
      imageUrl: req.file.path,
      publicId: req.file.filename,
      banner,
    });
  } catch (err) { next(err); }
});

// PUT /api/content-admin/banners/:id
router.put('/banners/:id', async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, {
      title: req.body.title,
      link: req.body.link,
      isActive: req.body.isActive,
    }, { new: true });
    cache.clear('banners');
    logActivity({ action: 'update', section: 'banner', description: `Updated banner: ${banner?.title || req.params.id}`, user: req.user });
    res.json(banner);
  } catch (err) { next(err); }
});

// PUT /api/content-admin/banners-reorder
router.put('/banners-reorder', async (req, res, next) => {
  try {
    const { order } = req.body;
    await Promise.all(order.map((id, i) => Banner.findByIdAndUpdate(id, { order: i })));
    cache.clear('banners');
    logActivity({ action: 'update', section: 'banner', description: 'Reordered banners', user: req.user });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/content-admin/banners/:id
router.delete('/banners/:id', async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    if (banner.image?.public_id) {
      await cloudinary.uploader.destroy(banner.image.public_id);
    }
    await banner.deleteOne();
    cache.clear('banners');
    logActivity({ action: 'delete', section: 'banner', description: `Deleted banner: ${banner.title || req.params.id}`, user: req.user });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// =====================================================================
// Centralized upload error handler (multer + Cloudinary).
// Converts known upload failures into structured 4xx responses.
// =====================================================================
router.use(uploadErrorHandler('content-admin'));

module.exports = router;
