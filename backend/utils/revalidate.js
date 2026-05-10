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

  // Fire-and-forget. We deliberately do not return the promise.
  (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      await fetch(`${FRONTEND_URL}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': SECRET,
        },
        body: JSON.stringify({ tags: list }),
        signal: controller.signal,
      });
    } catch {
      // Swallow — non-fatal. ISR will refresh on its natural TTL.
    } finally {
      clearTimeout(timer);
    }
  })();
};

module.exports = { revalidateTags };
