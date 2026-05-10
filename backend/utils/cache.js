// Simple in-memory cache with TTL
const { revalidateTags } = require('./revalidate');

const cache = new Map();

// Map backend cache prefixes → Next.js ISR tags defined in
// frontend/src/lib/serverApi.js. When a prefix is cleared (i.e. the
// underlying data changed), we also tell Next to drop its static cache
// for the matching tag. Anything not listed here triggers no
// revalidation — preserving the current behaviour for unrelated keys.
const PREFIX_TO_TAGS = {
  banners:    ['banners'],
  products:   ['products'],
  categories: ['categories'],
  pages:      ['pages'],
};

const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const set = (key, value, ttlSeconds = 300) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const del = (key) => cache.delete(key);

const clear = (prefix) => {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  // Fire-and-forget: notify the frontend to drop its ISR cache for the
  // matching tag(s). Non-blocking — see utils/revalidate.js.
  const tags = PREFIX_TO_TAGS[prefix];
  if (tags) revalidateTags(tags);
};

module.exports = { get, set, del, clear };
