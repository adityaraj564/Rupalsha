/**
 * Queue / Redis bootstrap.
 *
 * Design goals:
 *  - 100% optional. If REDIS_URL (or REDIS_HOST) isn't set, this module
 *    returns `{ enabled: false }` and no Redis / BullMQ code is loaded.
 *    Every existing call site keeps working exactly as before.
 *  - Lazy `require()` for bullmq + ioredis so they have ZERO cost when
 *    the queue is disabled (and the app still boots even if those
 *    packages aren't installed).
 *  - Single shared ioredis connection re-used by every Queue / Worker
 *    to avoid hitting Redis client-limit caps on small managed plans.
 *
 * Env vars:
 *  - REDIS_URL              e.g. redis://default:pass@host:6379  (preferred)
 *  - REDIS_HOST / REDIS_PORT / REDIS_PASSWORD                    (fallback)
 *  - QUEUE_ENABLED          'true' | 'false' | 'auto' (default)
 *                           'auto' = enable iff Redis config is present.
 *  - QUEUE_WORKER_INPROCESS 'true' (default) — run workers inside the API
 *                           process. Set to 'false' if you split workers
 *                           into a separate Render service via worker.js.
 */

const QUEUE_PREFIX = 'rupalsha';

let _state = null; // memoised — initialised on first call.

function _resolveRedisOpts() {
  const url = process.env.REDIS_URL;
  if (url) return { url };
  const host = process.env.REDIS_HOST;
  if (!host) return null;
  return {
    host,
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

function _resolveEnabled(redisOpts) {
  const flag = (process.env.QUEUE_ENABLED || 'auto').toLowerCase();
  if (flag === 'false') return false;
  if (flag === 'true') return Boolean(redisOpts); // require config even if forced
  return Boolean(redisOpts); // 'auto'
}

/**
 * Initialise (idempotent). Returns:
 *   { enabled: false }                                         — fallback mode
 *   { enabled: true, connection, Queue, Worker, QueueEvents }  — BullMQ ready
 */
function getQueueState() {
  if (_state) return _state;

  const redisOpts = _resolveRedisOpts();
  const enabled = _resolveEnabled(redisOpts);

  if (!enabled) {
    _state = { enabled: false };
    // eslint-disable-next-line no-console
    console.log('[queue] Redis not configured — running in inline mode (current behaviour).');
    return _state;
  }

  let IORedis, bullmq;
  try {
    IORedis = require('ioredis');
    bullmq = require('bullmq');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[queue] bullmq/ioredis not installed — falling back to inline mode:', err.message);
    _state = { enabled: false };
    return _state;
  }

  // BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`
  // on the *worker* connection. Using the same here keeps us on the safe side
  // for the shared connection pattern.
  const connection = redisOpts.url
    ? new IORedis(redisOpts.url, { maxRetriesPerRequest: null, enableReadyCheck: false })
    : new IORedis({ ...redisOpts, maxRetriesPerRequest: null, enableReadyCheck: false });

  connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[queue] redis error:', err.message);
  });
  connection.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[queue] redis connected.');
  });

  _state = {
    enabled: true,
    connection,
    prefix: QUEUE_PREFIX,
    Queue: bullmq.Queue,
    Worker: bullmq.Worker,
    QueueEvents: bullmq.QueueEvents,
    workerInProcess: (process.env.QUEUE_WORKER_INPROCESS || 'true').toLowerCase() !== 'false',
  };
  return _state;
}

module.exports = { getQueueState, QUEUE_PREFIX };
