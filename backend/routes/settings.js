const express = require('express');
const { body, validationResult } = require('express-validator');
const SiteSettings = require('../models/SiteSettings');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings — public read of non-sensitive settings
router.get('/', async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSingleton();
    res.json({
      cancellationFeeEnabled: settings.cancellationFeeEnabled,
      cancellationFeePercent: settings.cancellationFeePercent,
      cancellationFeeCap: settings.cancellationFeeCap,
      codEnabled: settings.codEnabled,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings — admin only
router.put(
  '/',
  adminAuth,
  [
    body('cancellationFeeEnabled').optional().isBoolean(),
    body('cancellationFeePercent').optional().isFloat({ min: 0, max: 100 }),
    body('cancellationFeeCap').optional().isFloat({ min: 0 }),
    body('codEnabled').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const settings = await SiteSettings.getSingleton();
      if (req.body.cancellationFeeEnabled !== undefined) {
        settings.cancellationFeeEnabled = Boolean(req.body.cancellationFeeEnabled);
      }
      if (req.body.cancellationFeePercent !== undefined) {
        settings.cancellationFeePercent = Number(req.body.cancellationFeePercent);
      }
      if (req.body.cancellationFeeCap !== undefined) {
        settings.cancellationFeeCap = Number(req.body.cancellationFeeCap);
      }
      if (req.body.codEnabled !== undefined) {
        settings.codEnabled = Boolean(req.body.codEnabled);
      }
      await settings.save();

      res.json({
        cancellationFeeEnabled: settings.cancellationFeeEnabled,
        cancellationFeePercent: settings.cancellationFeePercent,
        cancellationFeeCap: settings.cancellationFeeCap,
        codEnabled: settings.codEnabled,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
