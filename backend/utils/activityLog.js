const ActivityLog = require('../models/ActivityLog');

/**
 * Log a content admin activity
 * @param {Object} params
 * @param {string} params.action - 'create' | 'update' | 'delete' | 'toggle'
 * @param {string} params.section - 'banner' | 'faq' | 'page' | 'blog' | 'about'
 * @param {string} params.description - Human-readable description
 * @param {Object} params.user - req.user object with _id and name
 */
const logActivity = async ({ action, section, description, user }) => {
  try {
    await ActivityLog.create({
      action,
      section,
      description,
      userId: user._id,
      userName: user.name || user.email,
    });
  } catch {
    // Don't let logging failures break the main operation
  }
};

module.exports = { logActivity };
