/**
 * Standalone worker entry point.
 *
 * USE WHEN: you've scaled the backend to two Render services — one running
 * the API (`node server.js`) and one running only the job processors
 * (`node worker.js`). Set QUEUE_WORKER_INPROCESS=false on the API service
 * so it stops processing jobs itself.
 *
 * SAFE TO IGNORE: the default deployment still runs workers in-process via
 * server.js — this file exists only to make the future split a one-command
 * operation, not a refactor.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { registerJobHandlers, startInProcessWorkers, stopInProcessWorkers } = require('./utils/queueWorkers');
const { getQueueState } = require('./config/queue');
const { closeQueues } = require('./utils/queue');

(async () => {
  if (!getQueueState().enabled) {
    console.error('[worker] REDIS_URL is not configured — nothing to do. Exiting.');
    process.exit(1);
  }

  await connectDB();
  registerJobHandlers();

  // Force in-process even if the env var is set to false (this IS the worker
  // process, so the in-process flag effectively means "yes, run here").
  process.env.QUEUE_WORKER_INPROCESS = 'true';
  startInProcessWorkers();

  console.log('[worker] ready, processing jobs…');
})().catch((err) => {
  console.error('[worker] boot failed:', err);
  process.exit(1);
});

async function shutdown(signal) {
  console.log(`[worker] received ${signal}, draining…`);
  try {
    await stopInProcessWorkers();
    await closeQueues();
  } finally {
    process.exit(0);
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
