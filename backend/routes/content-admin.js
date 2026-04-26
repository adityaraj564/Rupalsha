const express = require('express');
const Banner = require('../models/Banner');
const { subAdminAuth } = require('../middleware/auth');
const upload = require('../utils/upload').banners;
const cloudinary = require('../config/cloudinary');
const cache = require('../utils/cache');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();

// All routes require subAdmin or admin auth
router.use(subAdminAuth);

// GET /api/content-admin/banners
router.get('/banners', async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json(banners);
  } catch (err) { next(err); }
});

// POST /api/content-admin/banners
router.post('/banners', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'rupalsha/banners',
      transformation: [{ width: 1920, quality: 'auto:good', fetch_format: 'auto' }],
    });

    const count = await Banner.countDocuments();
    const banner = await Banner.create({
      image: { url: result.secure_url, public_id: result.public_id },
      title: req.body.title || '',
      link: req.body.link || '',
      order: count,
    });

    cache.clear('banners');
    logActivity({ action: 'create', section: 'banner', description: `Created banner: ${banner.title || 'Untitled'}`, user: req.user });
    res.status(201).json(banner);
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

module.exports = router;
