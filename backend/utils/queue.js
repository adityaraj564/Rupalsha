/**
 * Thin queue abstraction used by the rest of the codebase.
 *
 *   enqueue('email:send', payload)
 *
 *   - If Redis/BullMQ is enabled  → adds to the BullMQ queue with the
 *     retry policy configured for that job name.
 *   - Otherwise                   → executes the registered handler
 *     INLINE, returning a promise that resolves when the handler does.
 *     This is the exact behaviour the codebase has today.
 *
 * Handlers are registered via `registerHandler(name, fn, defaultJobOpts)`
 * from utils/queueWorkers.js. The same handler powers both paths, so the
 * inline/queued modes are behaviourally identical.
 *
 * Failure semantics (inline mode):
 *  - The handler is called inside its own try/catch. Errors are logged
 *    and SWALLOWED — matching the existing fire-and-forget pattern of
 *    email/notification/revalidate utilities. Callers must continue to
 *    NOT rely on the promise rejecting.
 */

const { getQueueState } = require('../config/queue');

// jobName -> { handler, defaultOpts }
const _handlers = new Map();
// jobName -> BullMQ Queue instance (lazy-created on first enqueue)
const _queues = new Map();

function registerHandler(name, handler, defaultOpts = {}) {
  if (typeof handler !== 'function') {
    throw new Error(`Queue handler for "${name}" must be a function`);
  }
  _handlers.set(name, { handler, defaultOpts });
}

function getHandler(name) {
  return _handlers.get(name);
}

function getRegisteredJobNames() {
  return Array.from(_handlers.keys());
}

function _getOrCreateQueue(name) {
  const state = getQueueState();
  if (!state.enabled) return null;
  let q = _queues.get(name);
  if (q) return q;
  q = new state.Queue(name, {
    connection: state.connection,
    prefix: state.prefix,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 1000 },   // keep 1h / max 1k
      removeOnFail: { age: 24 * 3600, count: 1000 },  // keep 24h for inspection
    },
  });
  return q;
}

/**
 * Enqueue a job by name. Returns a promise.
 *
 * @param {string} name       registered job name (e.g. 'email:send')
 * @param {Object} payload    serialisable job data
 * @param {Object} [opts]     BullMQ JobsOptions override (delay, priority, jobId, etc.)
 * @returns {Promise<void>}   resolves when queued (queued mode) or completed (inline mode)
 */
async function enqueue(name, payload = {}, opts = {}) {
  const entry = _handlers.get(name);
  const state = getQueueState();

  // Queued path
  if (state.enabled) {
    try {
      const queue = _getOrCreateQueue(name);
      const mergedOpts = { ...(entry?.defaultOpts || {}), ...opts };
      await queue.add(name, payload, mergedOpts);
      return;
    } catch (err) {
      // If Redis is briefly unreachable we MUST NOT lose the work — fall
      // through to inline execution so behaviour matches the no-queue mode.
      // eslint-disable-next-line no-console
      console.error(`[queue] enqueue failed for "${name}", running inline:`, err.message);
    }
  }

  // Inline / fallback path
  if (!entry) {
    // eslint-disable-next-line no-console
    console.warn(`[queue] no handler registered for "${name}" (inline mode) — payload dropped`);
    return;
  }
  try {
    await entry.handler(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[queue] inline handler "${name}" failed:`, err.message);
    // Swallow — matches existing fire-and-forget contract.
  }
}

/**
 * Schedule a repeatable job (cron / interval). No-op when queue is disabled —
 * callers that need the work to always run MUST keep their existing
 * setInterval / scheduler as the primary mechanism.
 */
async function scheduleRepeatable(name, payload, repeatOpts, jobOpts = {}) {
  const state = getQueueState();
  if (!state.enabled) return false;
  try {
    const queue = _getOrCreateQueue(name);
    await queue.add(name, payload, {
      ...jobOpts,
      repeat: repeatOpts,
      jobId: jobOpts.jobId || `repeat:${name}`,
    });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[queue] scheduleRepeatable failed for "${name}":`, err.message);
    return false;
  }
}

function isQueueEnabled() {
  return getQueueState().enabled === true;
}

async function closeQueues() {
  const state = getQueueState();
  if (!state.enabled) return;
  await Promise.allSettled(Array.from(_queues.values()).map((q) => q.close()));
  _queues.clear();
}

module.exports = {
  registerHandler,
  getHandler,
  getRegisteredJobNames,
  enqueue,
  scheduleRepeatable,
  isQueueEnabled,
  closeQueues,
};
