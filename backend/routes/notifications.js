const express = require('express');
const mongoose = require('mongoose');
const { auth, adminAuth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  createNotification,
  createBulkNotifications,
} = require('../utils/notification');

const router = express.Router();

/**
 * GET /api/notifications
 * Query: page=1, limit=20, category=order|wallet|offer|alert|security|system, unread=1
 *
 * Returns:
 *   { notifications, total, unreadCount, page, pages, counts: { all, unread, order, wallet, ... } }
 */
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (req.query.category && Notification.CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }
    if (String(req.query.unread) === '1' || req.query.unread === 'true') {
      filter.read = false;
    }

    // Sort: priority asc (most important first), then newest first.
    const [notifications, total, unreadCount, byCategory] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, read: false }),
      Notification.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const counts = { all: 0, unread: unreadCount };
    for (const cat of Notification.CATEGORIES) counts[cat] = 0;
    let allTotal = 0;
    for (const row of byCategory) {
      counts[row._id] = row.total;
      allTotal += row.total;
    }
    counts.all = allTotal;

    res.json({
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      counts,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Lightweight endpoint for header bell badge polling.
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
    if (!updated) {
      // Either not found or already read — both are fine.
      return res.json({ ok: true });
    }
    res.json({ ok: true, notification: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Optional body: { category }
 */
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    const filter = { user: req.user._id, read: false };
    if (req.body && req.body.category && Notification.CATEGORIES.includes(req.body.category)) {
      filter.category = req.body.category;
    }
    const result = await Notification.updateMany(filter, {
      $set: { read: true, readAt: new Date() },
    });
    res.json({ ok: true, modified: result.modifiedCount || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/notifications
 * Clears all notifications for the current user. Optional ?category=xxx
 */
router.delete('/', auth, async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.category && Notification.CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }
    const result = await Notification.deleteMany(filter);
    res.json({ ok: true, deleted: result.deletedCount || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

/* ─────────── Admin: broadcast a promotional / system notification ─────────── */

/**
 * POST /api/notifications/broadcast
 * Body: { category, title, message, link?, meta?, audience? }
 * audience: 'all' (default) | 'users' (role=user only)
 */
router.post('/broadcast', adminAuth, async (req, res) => {
  try {
    const { category = 'offer', title, message, link, meta, audience } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ error: 'title and message are required' });
    }
    if (!Notification.CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'invalid category' });
    }

    const userFilter = audience === 'users' ? { role: 'user', isBlocked: { $ne: true } } : { isBlocked: { $ne: true } };
    const users = await User.find(userFilter).select('_id').lean();
    const ids = users.map((u) => u._id);

    const created = await createBulkNotifications(ids, { category, title, message, link, meta });
    res.json({ ok: true, recipients: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
});

/**
 * POST /api/notifications  (admin)
 * Send a notification to a specific user — useful for support / manual nudges.
 * Body: { userId, category, title, message, link?, meta? }
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    const { userId, category, title, message, link, meta } = req.body || {};
    if (!userId || !category || !title || !message) {
      return res.status(400).json({ error: 'userId, category, title, message are required' });
    }
    if (!Notification.CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'invalid category' });
    }
    const doc = await createNotification({ user: userId, category, title, message, link, meta });
    if (!doc) return res.status(500).json({ error: 'Failed to create notification' });
    res.json({ ok: true, notification: doc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

module.exports = router;
