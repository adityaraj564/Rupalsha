// Fire-and-forget on-demand revalidation.
// Pings the Next.js /api/revalidate route so ISR-cached pages refresh
// immediately after an admin write, instead of waiting for the TTL window.
//
// Design:
//  - Never blocks the calling request (no `await` needed at call site).
//  - 2s timeout — if the frontend is slow/down, we silently give up.
//  - Errors are swallowed (logged at debug level only). A failed
//    revalidation is non-fatal; the page will still refresh on its
//    natural TTL.
//  - No-op when REVALIDATE_SECRET or FRONTEND_URL is missing, so the
//    backend keeps working in environments where it isn't configured.

const FRONTEND_URL = process.env.FRONTEND_URL;
const SECRET = process.env.REVALIDATE_SECRET;

const revalidateTags = (tags) => {
  if (!FRONTEND_URL || !SECRET) return;
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [tags].filter(Boolean);
  if (list.length === 0) return;

  // Fire-and-forget. Hand off to the queue abstraction:
  //  - With Redis enabled, the ping is retryable (5 attempts) so a brief
  //    frontend hiccup no longer drops the cache-bust.
  //  - Without Redis, utils/queueWorkers.js runs the same fetch inline,
  //    matching the original behaviour (best-effort, ISR TTL fallback).
  const { enqueue } = require('./queue');
  enqueue('revalidate:tags', { tags: list }).catch(() => {
    // Swallow — non-fatal. ISR will refresh on its natural TTL.
  });
};

module.exports = { revalidateTags };
