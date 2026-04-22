const express = require('express');
const FAQ = require('../models/FAQ');
const { subAdminAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();

// GET /api/faqs - Public: get all active FAQs
router.get('/', async (req, res, next) => {
  try {
    const faqs = await FAQ.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.json({ faqs });
  } catch (error) {
    next(error);
  }
});

// GET /api/faqs/admin/all - Admin/SubAdmin: get all FAQs
router.get('/admin/all', subAdminAuth, async (req, res, next) => {
  try {
    const faqs = await FAQ.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.json({ faqs });
  } catch (error) {
    next(error);
  }
});

// POST /api/faqs/admin - Admin/SubAdmin: create FAQ
router.post('/admin', subAdminAuth, async (req, res, next) => {
  try {
    const { question, answer, category, sortOrder } = req.body;
    const faq = await FAQ.create({ question, answer, category, sortOrder: sortOrder || 0 });
    logActivity({ action: 'create', section: 'faq', description: `Created FAQ: ${question}`, user: req.user });
    res.status(201).json({ faq });
  } catch (error) {
    next(error);
  }
});

// PUT /api/faqs/admin/:id - Admin/SubAdmin: update FAQ
router.put('/admin/:id', subAdminAuth, async (req, res, next) => {
  try {
    const { question, answer, category, sortOrder, isActive } = req.body;
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { question, answer, category, sortOrder, isActive },
      { new: true, runValidators: true }
    );
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    logActivity({ action: 'update', section: 'faq', description: `Updated FAQ: ${faq.question}`, user: req.user });
    res.json({ faq });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/faqs/admin/:id - Admin/SubAdmin: delete FAQ
router.delete('/admin/:id', subAdminAuth, async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    logActivity({ action: 'delete', section: 'faq', description: `Deleted FAQ: ${faq.question}`, user: req.user });
    res.json({ message: 'FAQ deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
