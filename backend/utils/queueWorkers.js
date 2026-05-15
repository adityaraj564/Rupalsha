/**
 * Job handler registry + (optional) in-process BullMQ workers.
 *
 * Call `registerJobHandlers()` once at boot — it's safe to call when the
 * queue is disabled (it just populates the inline handler registry).
 *
 * Call `startInProcessWorkers()` AFTER registration to spin up BullMQ
 * Worker instances inside the API process. Skipped automatically when
 * Redis is disabled or when QUEUE_WORKER_INPROCESS=false.
 *
 * Handler contract:
 *   async (payload) => any
 *   - Throwing causes BullMQ to retry per the queue's retry policy.
 *   - In inline mode, throws are swallowed by utils/queue.js (matches
 *     the existing fire-and-forget behaviour of email/notification).
 */

const nodemailer = require('nodemailer');
const { getQueueState } = require('../config/queue');
const { registerHandler, getHandler, getRegisteredJobNames } = require('./queue');

// ─────────────────────────────────────────────────────────────────────────────
// Handler: email:send
// Wraps the same SMTP transport used by utils/email.js. Kept self-contained
// so the worker process can run this without circular imports.
// ─────────────────────────────────────────────────────────────────────────────
async function handleEmailSend(payload) {
  const { to, subject, html } = payload || {};
  if (!to || !subject || !html) return;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const port = Number(process.env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  await transporter.sendMail({
    from: `"Rupalsha" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler: notification:broadcast
// Fan-out to every active user. Mirrors notification.js#broadcastToAllUsers
// but as a retryable job. Kept resilient — partial failures are recoverable.
// ─────────────────────────────────────────────────────────────────────────────
async function handleNotificationBroadcast(payload) {
  // Lazy require to avoid loading Mongoose models in a worker-only process
  // before the DB connection is up.
  const User = require('../models/User');
  const { createBulkNotifications } = require('./notification');

  const { payload: notifPayload, usersOnly = true } = payload || {};
  if (!notifPayload) return;

  const filter = { isBlocked: { $ne: true } };
  if (usersOnly) filter.role = 'user';
  const users = await User.find(filter).select('_id').lean();
  const ids = users.map((u) => u._id);
  if (ids.length === 0) return;
  await createBulkNotifications(ids, notifPayload);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler: revalidate:tags
// Pings the Next.js /api/revalidate route. Retryable when the frontend is
// briefly unreachable (cold start, deploy, etc.).
// ─────────────────────────────────────────────────────────────────────────────
async function handleRevalidateTags(payload) {
  const { tags } = payload || {};
  const FRONTEND_URL = process.env.FRONTEND_URL;
  const SECRET = process.env.REVALIDATE_SECRET;
  if (!FRONTEND_URL || !SECRET) return;
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [tags].filter(Boolean);
  if (list.length === 0) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${FRONTEND_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': SECRET,
      },
      body: JSON.stringify({ tags: list }),
      signal: controller.signal,
    });
    if (!res.ok && res.status >= 500) {
      // Trigger retry via BullMQ on transient server errors.
      throw new Error(`revalidate responded ${res.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler: wallet:sweepStaleRecharges
// Optional async mirror of the existing setInterval sweep. The setInterval in
// server.js remains the primary mechanism — this is registered only so a
// future repeatable BullMQ job can replace it without code changes.
// ─────────────────────────────────────────────────────────────────────────────
async function handleWalletSweep() {
  const walletRoutes = require('../routes/wallet');
  if (typeof walletRoutes.expireStalePendingRecharges === 'function') {
    await walletRoutes.expireStalePendingRecharges();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-job retry / concurrency defaults.
// ─────────────────────────────────────────────────────────────────────────────
const JOB_DEFS = {
  'email:send': {
    handler: handleEmailSend,
    defaultOpts: { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
    workerOpts: { concurrency: 5 },
  },
  'notification:broadcast': {
    handler: handleNotificationBroadcast,
    defaultOpts: { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    workerOpts: { concurrency: 1 },
  },
  'revalidate:tags': {
    handler: handleRevalidateTags,
    defaultOpts: { attempts: 5, backoff: { type: 'exponential', delay: 3000 } },
    workerOpts: { concurrency: 3 },
  },
  'wallet:sweepStaleRecharges': {
    handler: handleWalletSweep,
    defaultOpts: { attempts: 1 },
    workerOpts: { concurrency: 1 },
  },
};

function registerJobHandlers() {
  for (const [name, def] of Object.entries(JOB_DEFS)) {
    registerHandler(name, def.handler, def.defaultOpts);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Workers — only started when Redis is enabled.
// ─────────────────────────────────────────────────────────────────────────────
const _workers = [];

function startInProcessWorkers() {
  const state = getQueueState();
  if (!state.enabled) return [];
  if (!state.workerInProcess) {
    // eslint-disable-next-line no-console
    console.log('[queue] QUEUE_WORKER_INPROCESS=false — workers will run in a separate process.');
    return [];
  }

  for (const name of getRegisteredJobNames()) {
    const def = JOB_DEFS[name];
    const entry = getHandler(name);
    if (!entry) continue;

    const worker = new state.Worker(
      name,
      async (job) => entry.handler(job.data),
      {
        connection: state.connection,
        prefix: state.prefix,
        ...(def?.workerOpts || {}),
      },
    );

    worker.on('failed', (job, err) => {
      // eslint-disable-next-line no-console
      console.error(`[queue:${name}] job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
    });
    worker.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(`[queue:${name}] worker error:`, err.message);
    });

    _workers.push(worker);
  }

  // eslint-disable-next-line no-console
  console.log(`[queue] started ${_workers.length} in-process worker(s): ${getRegisteredJobNames().join(', ')}`);
  return _workers;
}

async function stopInProcessWorkers() {
  await Promise.allSettled(_workers.map((w) => w.close()));
  _workers.length = 0;
}

module.exports = {
  registerJobHandlers,
  startInProcessWorkers,
  stopInProcessWorkers,
  JOB_DEFS,
};
