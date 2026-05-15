const Notification = require('../models/Notification');
// Note: User is loaded lazily inside the broadcast handler in queueWorkers.js
// to keep this module free of side-effects when imported by worker processes.

/**
 * Default priority per category.
 * Lower = more important (matches Notification.priority semantics).
 */
const CATEGORY_PRIORITY = {
  order: 1,
  wallet: 2,
  security: 3,
  alert: 4,
  offer: 5,
  system: 6,
};

/**
 * Create a single notification. Never throws — notifications are best-effort
 * and must not break the originating business operation.
 *
 * @param {Object} params
 * @param {String|ObjectId} params.user        target user id (required)
 * @param {String} params.category             one of Notification.CATEGORIES
 * @param {String} params.title                short headline
 * @param {String} params.message              body text
 * @param {String} [params.type]               e.g. 'order.placed'
 * @param {String} [params.link]               client route to open on click
 * @param {Object} [params.meta]               arbitrary payload
 * @param {Number} [params.priority]           override default priority
 * @returns {Promise<Object|null>}             created doc or null on failure
 */
async function createNotification(params) {
  try {
    if (!params || !params.user || !params.category || !params.title || !params.message) {
      return null;
    }
    const priority = typeof params.priority === 'number'
      ? params.priority
      : (CATEGORY_PRIORITY[params.category] || 5);

    const doc = await Notification.create({
      user: params.user,
      category: params.category,
      type: params.type || '',
      title: params.title,
      message: params.message,
      link: params.link || '',
      meta: params.meta || {},
      priority,
    });
    return doc;
  } catch (err) {
    // Best-effort: log and swallow.
    // eslint-disable-next-line no-console
    console.error('[notification] create failed:', err.message);
    return null;
  }
}

/**
 * Fan-out helper: send the same notification to many users.
 * Useful for sitewide offers / promotions.
 */
async function createBulkNotifications(userIds, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;
  try {
    const priority = typeof payload.priority === 'number'
      ? payload.priority
      : (CATEGORY_PRIORITY[payload.category] || 5);

    const docs = userIds.map((u) => ({
      user: u,
      category: payload.category,
      type: payload.type || '',
      title: payload.title,
      message: payload.message,
      link: payload.link || '',
      meta: payload.meta || {},
      priority,
    }));
    const res = await Notification.insertMany(docs, { ordered: false });
    return res.length;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notification] bulk create failed:', err.message);
    return 0;
  }
}

/**
 * Fire-and-forget broadcast to every active customer.
 * Returns immediately; the actual fan-out runs on next tick so it never
 * blocks the originating request.
 *
 * @param {Object} payload      same shape as createNotification (no `user`)
 * @param {Object} [opts]
 * @param {Boolean} [opts.usersOnly=true]   exclude admins/subadmins from the fan-out
 */
function broadcastToAllUsers(payload, opts = {}) {
  const usersOnly = opts.usersOnly !== false;
  // Hand off to the queue abstraction. When Redis is enabled this becomes a
  // retryable background job; when it isn't, utils/queue.js runs the handler
  // inline — we still wrap in setImmediate to preserve the original
  // fire-and-forget semantics (caller never awaits, never sees errors).
  setImmediate(() => {
    const { enqueue } = require('./queue');
    enqueue('notification:broadcast', { payload, usersOnly }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[notification] broadcast enqueue failed:', err.message);
    });
  });
}

module.exports = {
  createNotification,
  createBulkNotifications,
  broadcastToAllUsers,
  CATEGORY_PRIORITY,
};
