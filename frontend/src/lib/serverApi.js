// Server-side fetch helpers for use inside Server Components.
// These run on the Next.js server (or at build time during ISR) and rely on
// Next's built-in fetch cache + `revalidate` for instant page paints.
//
// IMPORTANT: NEVER import this file from a client component. It uses Node's
// fetch() with `next: { revalidate }` which is server-only metadata.

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000/api';

// Default ISR window (in seconds). Pages will be regenerated at most once per
// REVALIDATE_SECONDS, served from the edge cache otherwise.
const REVALIDATE_SECONDS = 60;

/**
 * Fetch JSON from the backend with ISR caching.
 *
 * @param {string} path - API path beginning with `/`, e.g. `/products?featured=true`.
 * @param {object} [opts]
 * @param {number} [opts.revalidate] - Seconds before the cache entry is
 *   considered stale and a background regeneration is triggered. Default 60.
 * @param {string[]} [opts.tags] - Optional cache tags for on-demand
 *   revalidation via `revalidateTag()`.
 * @returns {Promise<any|null>} Parsed JSON, or null on error.
 */
export async function serverFetch(path, opts = {}) {
  const { revalidate = REVALIDATE_SECONDS, tags } = opts;
  const url = `${API_URL}${path}`;
  try {
    const next = { revalidate };
    if (Array.isArray(tags) && tags.length > 0) next.tags = tags;
    const res = await fetch(url, { next });
    if (res.status === 404) {
      // Genuine "not found" — caller can safely render notFound().
      return null;
    }
    if (!res.ok) {
      // Transient backend failure (500, 502, 503, timeout middleware, etc.).
      // We must NOT return null here: callers like the product page would
      // then trigger notFound(), and Next.js would cache that 404 for the
      // whole `revalidate` window — leaving the page broken even after
      // the data is fine again. Throwing surfaces the failure to Next's
      // error boundary instead, which is not cached.
      throw new Error(`serverFetch ${path} failed: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    // Distinguish "no response" from "explicit 404". A network blip during
    // an admin write is exactly when the user is most likely to refresh —
    // re-throw so the page renders error.js (uncached) instead of a
    // permanently-cached 404.
    if (err && err.message && err.message.startsWith('serverFetch')) throw err;
    throw new Error(`serverFetch ${path} network error: ${err?.message || err}`);
  }
}

// Safe variant for non-critical data (banners, sidebars, etc.) where we'd
// rather fall back to defaults than crash the page. Returns null on any
// error — including transient ones. Do NOT use this for data that drives
// notFound(), or a hiccup will get cached as a 404.
export async function serverFetchSafe(path, opts = {}) {
  try {
    return await serverFetch(path, opts);
  } catch {
    return null;
  }
}

// ── Page-specific helpers ────────────────────────────────────────────────

// Homepage uses the safe variant so a single failing endpoint just falls
// back to defaults instead of crashing the whole landing page.
export const serverHomeAPI = {
  banners:    () => serverFetchSafe('/banners',             { revalidate: 30, tags: ['banners'] }),
  categories: () => serverFetchSafe('/categories/tree',     { revalidate: 600, tags: ['categories'] }),
  pages:      (keys) => serverFetchSafe(`/pages?keys=${encodeURIComponent(keys.join(','))}`, { revalidate: 300, tags: ['pages'] }),
  featured:   () => serverFetchSafe('/products?featured=true&limit=8&hideOutOfStock=true', { revalidate: 60, tags: ['products'] }),
  trending:   () => serverFetchSafe('/products?trending=true&limit=8&hideOutOfStock=true', { revalidate: 60, tags: ['products'] }),
};

export const serverProductsAPI = {
  product: (slug) => serverFetch(`/products/${encodeURIComponent(slug)}`, { revalidate: 60, tags: [`product:${slug}`, 'products'] }),
  list:    (qs)   => serverFetch(`/products?${qs}`, { revalidate: 60, tags: ['products'] }),
};
