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
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Backend unreachable (cold start, network blip). Caller should fall back
    // to defaults — never let a single API failure break the whole page.
    return null;
  }
}

// ── Page-specific helpers ────────────────────────────────────────────────

export const serverHomeAPI = {
  banners:    () => serverFetch('/banners',             { revalidate: 30, tags: ['banners'] }),
  categories: () => serverFetch('/categories/tree',     { revalidate: 600, tags: ['categories'] }),
  pages:      (keys) => serverFetch(`/pages?keys=${encodeURIComponent(keys.join(','))}`, { revalidate: 300, tags: ['pages'] }),
  featured:   () => serverFetch('/products?featured=true&limit=8&hideOutOfStock=true', { revalidate: 60, tags: ['products'] }),
  trending:   () => serverFetch('/products?trending=true&limit=8&hideOutOfStock=true', { revalidate: 60, tags: ['products'] }),
};

export const serverProductsAPI = {
  product: (slug) => serverFetch(`/products/${encodeURIComponent(slug)}`, { revalidate: 60, tags: [`product:${slug}`, 'products'] }),
  list:    (qs)   => serverFetch(`/products?${qs}`, { revalidate: 60, tags: ['products'] }),
};
