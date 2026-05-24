const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ──────────────────────────────────────────────────────────────────────────
// Persistent SWR-style response cache
// --------------------------------------------------------------------------
// Two layers:
//   1. In-memory Map (fast, survives within a tab session)
//   2. localStorage (survives full page refresh)
// Behaviour: on read → memory hit → localStorage hit → null. On write → both.
// Only public, non-personalised endpoints (products, banners, categories,
// pages, blogs, etc.) opt in. Anything personal (cart, wallet, orders) skips
// the cache by simply not calling getCached/setCache.
// ──────────────────────────────────────────────────────────────────────────
const responseCache = new Map();
const STORAGE_PREFIX = 'rupalsha_apiCache:';
const STORAGE_INDEX_KEY = 'rupalsha_apiCacheIndex';

const CACHE_TTL = {
  short: 60 * 1000,            // 1 min  – product lists, search
  medium: 5 * 60 * 1000,       // 5 min  – categories, banners, pages
  long: 15 * 60 * 1000,        // 15 min – about, FAQs
};

// SWR threshold: cached entries older than `ttl` are still returned, but a
// background revalidation kicks in. They become "hard expired" and discarded
// after `ttl * STALE_MULTIPLIER`. Bigger multiplier = slower fallback to
// network on truly stale data, but better instant-paint UX.
const STALE_MULTIPLIER = 6;

const safeStorage = (() => {
  if (typeof window === 'undefined') return null;
  try {
    const t = '__rs_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return null;
  }
})();

const readFromStorage = (key) => {
  if (!safeStorage) return null;
  try {
    const raw = safeStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeToStorage = (key, entry) => {
  if (!safeStorage) return;
  try {
    safeStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    // Keep a small index for cache bookkeeping (cap to ~80 entries)
    const idxRaw = safeStorage.getItem(STORAGE_INDEX_KEY);
    const idx = idxRaw ? JSON.parse(idxRaw) : [];
    if (!idx.includes(key)) idx.push(key);
    while (idx.length > 80) {
      const evicted = idx.shift();
      safeStorage.removeItem(STORAGE_PREFIX + evicted);
    }
    safeStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(idx));
  } catch {
    // Quota exceeded → clear our cache and bail.
    try { clearApiCache(); } catch {}
  }
};

const removeFromStorage = (key) => {
  if (!safeStorage) return;
  try { safeStorage.removeItem(STORAGE_PREFIX + key); } catch {}
};

/**
 * Returns the cached value for `key` if it exists, regardless of staleness.
 * Caller is responsible for deciding whether to revalidate.
 *
 * Each entry has shape: { value, savedAt, ttl }
 */
const getCached = (key) => {
  const fromMem = responseCache.get(key);
  if (fromMem) return fromMem;
  const fromDisk = readFromStorage(key);
  if (fromDisk) {
    responseCache.set(key, fromDisk);
    return fromDisk;
  }
  return null;
};

const isFresh = (entry, ttl) => entry && (Date.now() - entry.savedAt) < ttl;
const isHardExpired = (entry, ttl) => !entry || (Date.now() - entry.savedAt) > ttl * STALE_MULTIPLIER;

const setCache = (key, value, ttl = CACHE_TTL.short) => {
  // Cap memory map size to avoid runaway growth in long sessions
  if (responseCache.size > 200) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  const entry = { value, savedAt: Date.now(), ttl };
  responseCache.set(key, entry);
  writeToStorage(key, entry);
};

/**
 * Synchronously peek at a cached API response without triggering a fetch.
 * Useful as a `useState` initializer to paint the previous result instantly.
 * Returns the cached value (or null) regardless of staleness — the next call
 * to the SWR-aware API will quietly revalidate in the background.
 */
export const peekCached = (key) => {
  const entry = getCached(key);
  return entry ? entry.value : null;
};

/**
 * Surgically write a value into the SWR cache. Used by callers that perform
 * optimistic mutations — they patch the relevant cache entry directly so
 * other tabs/views see consistent data without a full refetch.
 *
 *   writeApiCache('notifications:order', updatedRes, 15 * 1000);
 *
 * Pass `null` as the value to remove the entry.
 */
export const writeApiCache = (key, value, ttl = CACHE_TTL.short) => {
  if (value === null) {
    responseCache.delete(key);
    removeFromStorage(key);
    return;
  }
  setCache(key, value, ttl);
};

export const clearApiCache = (prefix) => {
  if (!prefix) {
    responseCache.clear();
    if (!safeStorage) return;
    try {
      const idxRaw = safeStorage.getItem(STORAGE_INDEX_KEY);
      const idx = idxRaw ? JSON.parse(idxRaw) : [];
      idx.forEach((k) => safeStorage.removeItem(STORAGE_PREFIX + k));
      safeStorage.removeItem(STORAGE_INDEX_KEY);
    } catch {}
    return;
  }
  for (const key of Array.from(responseCache.keys())) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
      removeFromStorage(key);
    }
  }
};

/**
 * Stale-While-Revalidate fetcher.
 *
 *   const data = await swr('products:featured', () => request('/products?...'), CACHE_TTL.short);
 *
 * - If a fresh entry exists → return it; no network (default).
 * - If a stale (within hard-expiry) entry exists → return it instantly AND
 *   trigger a background fetch that updates the cache for the next visit.
 * - If nothing is cached (or hard-expired) → await the network.
 *
 * Options:
 *   alwaysRevalidate: fire a background refetch on every call regardless of
 *     freshness. Use this for stock-sensitive endpoints (product detail,
 *     product lists, cart) so users never see stale stock or pricing for
 *     more than a network round-trip.
 *   onFresh(value): callback invoked with the freshly-fetched value when a
 *     background revalidation actually completes AND the new value differs
 *     from the cached one. Lets pages re-render with up-to-date data without
 *     polling.
 *
 * This is the same pattern used by Vercel's swr / TanStack Query — no UI
 * flicker, instant paints, and self-healing freshness.
 */
const swr = (key, fetcher, ttl = CACHE_TTL.short, { alwaysRevalidate = false, onFresh = null } = {}) => {
  const entry = getCached(key);
  // Nothing usable → must fetch.
  if (!entry || isHardExpired(entry, ttl)) {
    return fetcher().then((value) => { setCache(key, value, ttl); return value; });
  }
  const fresh = isFresh(entry, ttl);
  // Fresh AND no force-revalidate → return without revalidation.
  if (fresh && !alwaysRevalidate) {
    return Promise.resolve(entry.value);
  }
  // Stale (or always-revalidate) → return immediately, refetch in background.
  fetcher()
    .then((value) => {
      setCache(key, value, ttl);
      if (onFresh) {
        // Cheap deep-equality check via JSON stringify. Skips the callback
        // when the response is byte-identical, sparing a re-render.
        let changed = true;
        try { changed = JSON.stringify(value) !== JSON.stringify(entry.value); } catch {}
        if (changed) {
          try { onFresh(value); } catch {}
        }
      }
    })
    .catch(() => {});
  return Promise.resolve(entry.value);
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('rupalsha_token');
  }
  return null;
};

const request = async (endpoint, options = {}, retries = 2) => {
  const token = getToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Let GETs leverage browser HTTP cache (controlled by server's
      // Cache-Control headers). Mutations always bypass it. Callers can
      // also force `cache: 'no-store'` (e.g. checkout pages) via options.
      const isGet = !options.method || options.method === 'GET';
      const cacheMode = options.cache || (isGet ? 'default' : 'no-store');
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        cache: cacheMode,
        signal: options.signal,
        body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await res.json();

      if (!res.ok) {
        const err = new ApiError(data.error || data.errors?.[0]?.msg || 'Something went wrong', res.status);
        // Surface structured details (e.g. { reason, productId, available })
        // so callers can render a precise error message.
        Object.assign(err, data);
        throw err;
      }

      return data;
    } catch (err) {
      // Don't retry aborts, client errors (4xx), or the last attempt.
      if (err && (err.name === 'AbortError' || err.code === 20)) throw err;
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) throw err;
      if (attempt === retries) throw err;
      // Wait before retrying: 1s, then 2s
      await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    }
  }
};

// Auth
export const authAPI = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
  changePassword: (data) => request('/auth/change-password', { method: 'PUT', body: data }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: data }),
  requestLoginOtp: (email) => request('/auth/login-otp/request', { method: 'POST', body: { email } }),
  verifyLoginOtp: (data) => request('/auth/login-otp/verify', { method: 'POST', body: data }),
  googleLogin: (credential) => request('/auth/google', { method: 'POST', body: { credential } }),
  addAddress: (data) => request('/auth/addresses', { method: 'POST', body: data }),
  updateAddress: (id, data) => request(`/auth/addresses/${id}`, { method: 'PUT', body: data }),
  deleteAddress: (id) => request(`/auth/addresses/${id}`, { method: 'DELETE' }),
};

// Products
// Stock and price are time-sensitive, so these endpoints always revalidate
// in the background even when the cached entry is "fresh". Users see the
// previous response instantly, then any inventory change reaches them within
// one round-trip via the optional `onFresh` callback.
export const productsAPI = {
  getAll: (params, { onFresh } = {}) => {
    const query = new URLSearchParams(params).toString();
    return swr(`products:${query}`, () => request(`/products?${query}`), CACHE_TTL.short, { alwaysRevalidate: true, onFresh });
  },
  /**
   * Fetch a product by slug.
   *
   * Options:
   *  - onFresh(value): SWR background revalidation callback.
   *  - fresh: when `true`, bypass the cache entirely and hit the network.
   *    Used by checkout / low-stock flows where freshness > speed.
   */
  getBySlug: (slug, { onFresh, fresh = false } = {}) => {
    if (fresh) {
      const p = request(`/products/${slug}`, { cache: 'no-store' });
      // Still warm the SWR cache so subsequent non-fresh reads benefit.
      p.then((value) => writeApiCache(`product:${slug}`, value, CACHE_TTL.short)).catch(() => {});
      return p;
    }
    return swr(`product:${slug}`, () => request(`/products/${slug}`), CACHE_TTL.short, { alwaysRevalidate: true, onFresh });
  },
  getSimilar: (slug, limit = 8, { onFresh } = {}) =>
    swr(`similar:${slug}:${limit}`, () => request(`/products/${slug}/similar?limit=${limit}`), CACHE_TTL.medium, { alwaysRevalidate: true, onFresh }),
  getCategories: () =>
    swr('productCategories', () => request('/products/categories'), CACHE_TTL.medium),
  // Bump real view counters for social-proof copy. Public + idempotent
  // per-session on the client (gated via sessionStorage) so a single
  // visitor refreshing the page does not inflate "viewed today" numbers.
  // Failures are silent — this is purely cosmetic.
  trackView: (id) =>
    request(`/products/${id}/view`, { method: 'POST' }).catch(() => null),
};

// Categories
export const categoriesAPI = {
  getTree: () =>
    swr('categoriesTree', () => request('/categories'), CACHE_TTL.medium),
  getFlat: (params) => {
    const query = new URLSearchParams(params).toString();
    return swr(`categoriesFlat:${query}`, () => request(`/categories/flat?${query}`), CACHE_TTL.medium);
  },
  getBySlug: (slug) =>
    swr(`category:${slug}`, () => request(`/categories/${slug}`), CACHE_TTL.medium),
};

// Cart
export const cartAPI = {
  get: () => request('/cart'),
  add: (data) => request('/cart/add', { method: 'POST', body: data }),
  update: (data) => request('/cart/update', { method: 'PUT', body: data }),
  remove: (itemId) => request(`/cart/remove/${itemId}`, { method: 'DELETE' }),
  clear: () => request('/cart/clear', { method: 'DELETE' }),
};

// Orders
export const ordersAPI = {
  /**
   * Place an order.
   *
   * Pass `idempotencyKey` to make this safe to retry. The server will
   * return the previously-created order on duplicates instead of creating
   * another one. Callers should generate a fresh UUID on the checkout
   * page mount and reuse it across retries of the same logical attempt.
   */
  create: (data, { idempotencyKey } = {}) =>
    request('/orders', {
      method: 'POST',
      body: data,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  /**
   * Strict pre-payment validation. Always hits the network (no cache) and
   * returns `{ ok, issues }` describing any cart items that became
   * unavailable, out of stock, or changed price since they were added.
   */
  validate: () => request('/orders/validate', { method: 'POST', cache: 'no-store' }),
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders?${query}`);
  },
  getById: (id) => request(`/orders/${id}`),
  cancel: (id, reason, acknowledgeFee = false) =>
    request(`/orders/${id}/cancel`, { method: 'PUT', body: { reason, acknowledgeFee } }),
  returnOrder: (id, reason) => request(`/orders/${id}/return`, { method: 'PUT', body: { reason } }),
};

// Returns (return requests with evidence)
export const returnsAPI = {
  create: (formData) => request('/returns', { method: 'POST', body: formData }),
  getMine: () => request('/returns/my'),
  getByOrder: (orderId) => request(`/returns/by-order/${orderId}`),
  getAllByOrder: (orderId) => request(`/returns/by-order/${orderId}/all`),
  getById: (id) => request(`/returns/${id}`),
  cancel: (id) => request(`/returns/${id}/cancel`, { method: 'POST' }),
  // Admin
  listAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/returns?${query}`);
  },
  updateStatus: (id, data) => request(`/returns/${id}/status`, { method: 'PATCH', body: data }),
};

// Wallet
export const walletAPI = {
  get: () => request('/wallet'),
  transactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/wallet/transactions?${query}`);
  },
  rechargeCreate: (amount) => request('/wallet/recharge/create', { method: 'POST', body: { amount } }),
  rechargeVerify: (data) => request('/wallet/recharge/verify', { method: 'POST', body: data }),
  // Admin
  adminGetUser: (userId) => request(`/wallet/admin/user/${userId}`),
  adminAdjust: (data) => request('/wallet/admin/adjust', { method: 'POST', body: data }),
};

// Reviews
export const reviewsAPI = {
  getByProduct: (productId, params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reviews/product/${productId}?${query}`);
  },
  create: (data) => {
    const formData = new FormData();
    formData.append('productId', data.productId);
    formData.append('rating', data.rating);
    if (data.title) formData.append('title', data.title);
    formData.append('comment', data.comment);
    if (data.images) {
      data.images.forEach((file) => formData.append('images', file));
    }
    return request('/reviews', { method: 'POST', body: formData });
  },
};

// Wishlist
export const wishlistAPI = {
  get: () => request('/wishlist'),
  add: (productId) => request(`/wishlist/${productId}`, { method: 'POST' }),
  remove: (productId) => request(`/wishlist/${productId}`, { method: 'DELETE' }),
};

// Payment
export const paymentAPI = {
  createOrder: (orderId) => request('/payment/create-order', { method: 'POST', body: { orderId } }),
  verify: (data) => request('/payment/verify', { method: 'POST', body: data }),
};

// Coupons
export const couponsAPI = {
  validate: (code, orderTotal) => request('/coupons/validate', { method: 'POST', body: { code, orderTotal } }),
  getActive: () =>
    swr('couponsActive', () => request('/coupons/active', { auth: false }), CACHE_TTL.medium),
};

// Contact
export const contactAPI = {
  send: (data) => request('/contact', { method: 'POST', body: data }),
};

// FAQs (public)
export const faqsAPI = {
  getAll: () => swr('faqs', () => request('/faqs'), CACHE_TTL.medium),
};

// Page Content (public)
export const pagesAPI = {
  get: (key) =>
    swr(`page:${key}`, () => request(`/pages/${key}`), CACHE_TTL.medium),
  /**
   * Batch-fetch multiple pages in a single HTTP round-trip.
   * Result is cached under one SWR key AND every individual `page:<key>`
   * cache slot is seeded so subsequent `pagesAPI.get(k)` calls are instant.
   */
  getMany: (keys) => {
    const list = Array.from(new Set((keys || []).filter(Boolean))).sort();
    if (list.length === 0) return Promise.resolve({ pages: {} });
    const cacheKey = `pages:batch:${list.join(',')}`;
    const fetcher = () =>
      request(`/pages?keys=${encodeURIComponent(list.join(','))}`).then((data) => {
        const map = data?.pages || {};
        // Seed individual page caches so any later pagesAPI.get(k) is a hit.
        for (const k of list) {
          if (map[k]) {
            try { setCache(`page:${k}`, { page: map[k] }, CACHE_TTL.medium); } catch {}
          }
        }
        return data;
      });
    return swr(cacheKey, fetcher, CACHE_TTL.medium);
  },
};

// About
export const aboutAPI = {
  get: () => swr('about', () => request('/about'), CACHE_TTL.long),
  update: (data) => request('/about', { method: 'PUT', body: data }).then(d => { clearApiCache('about'); return d; }),
  uploadCover: (formData) => request('/about/cover', { method: 'PUT', body: formData }).then(d => { clearApiCache('about'); return d; }),
  uploadCoverMobile: (formData) => request('/about/cover-mobile', { method: 'PUT', body: formData }).then(d => { clearApiCache('about'); return d; }),
  removeCoverMobile: () => request('/about/cover-mobile', { method: 'DELETE' }).then(d => { clearApiCache('about'); return d; }),
  updateTeamMember: (index, data) => request(`/about/team/${index}`, { method: 'PUT', body: data }).then(d => { clearApiCache('about'); return d; }),
  uploadTeamImage: (index, formData) => request(`/about/team/${index}/image`, { method: 'PUT', body: formData }).then(d => { clearApiCache('about'); return d; }),
  addTeamMember: (data) => request('/about/team', { method: 'POST', body: data }).then(d => { clearApiCache('about'); return d; }),
  removeTeamMember: (index) => request(`/about/team/${index}`, { method: 'DELETE' }).then(d => { clearApiCache('about'); return d; }),
};

// Admin
export const adminAPI = {
  getDashboard: () => request('/admin/dashboard'),
  // Direct-to-Cloudinary upload signature
  getUploadSignature: (folder, resource_type) =>
    request('/admin/upload-signature', {
      method: 'POST',
      body: { folder, resource_type },
    }),
  // Products
  getProducts: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/products?${query}`);
  },
  createProduct: (data) => request('/admin/products', { method: 'POST', body: data }).then(d => { clearApiCache('products'); clearApiCache('product'); return d; }),
  updateProduct: (id, data) => request(`/admin/products/${id}`, { method: 'PUT', body: data }).then(d => { clearApiCache('products'); clearApiCache('product'); return d; }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('products'); clearApiCache('product'); return d; }),
  // Inventory
  getInventory: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/inventory?${query}`);
  },
  importActualPrices: (rows) =>
    request('/admin/inventory/import-actual-prices', { method: 'POST', body: { rows } }),
  // Orders
  getOrders: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/orders?${query}`);
  },
  updateOrderStatus: (id, data) => request(`/admin/orders/${id}/status`, { method: 'PUT', body: data }),
  updateOrderRefund: (id, data) => request(`/admin/orders/${id}/refund`, { method: 'PUT', body: data }),
  deleteOrder: (id) => request(`/admin/orders/${id}`, { method: 'DELETE' }),
  // Users
  getUsers: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users?${query}`);
  },
  toggleBlockUser: (id) => request(`/admin/users/${id}/block`, { method: 'PUT' }),
  updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  // Reviews
  getReviews: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/reviews?${query}`);
  },
  approveReview: (id) => request(`/admin/reviews/${id}/approve`, { method: 'PUT' }),
  deleteReview: (id) => request(`/admin/reviews/${id}`, { method: 'DELETE' }),
  // Coupons
  getCoupons: () => request('/admin/coupons'),
  createCoupon: (data) => request('/admin/coupons', { method: 'POST', body: data }),
  deleteCoupon: (id) => request(`/admin/coupons/${id}`, { method: 'DELETE' }),
  // Contacts
  getContacts: () => request('/admin/contacts'),
  // Categories
  getCategories: () => request('/admin/categories'),
  createCategory: (data) => request('/admin/categories', { method: 'POST', body: data }).then(d => { clearApiCache('categories'); return d; }),
  updateCategory: (id, data) => request(`/admin/categories/${id}`, { method: 'PUT', body: data }).then(d => { clearApiCache('categories'); return d; }),
  uploadCategoryImage: (id, formData) => request(`/admin/categories/${id}`, { method: 'PUT', body: formData }).then(d => { clearApiCache('categories'); return d; }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('categories'); return d; }),
  // Banners
  getBanners: () => request('/admin/banners'),
  createBanner: (formData) => request('/admin/banners', { method: 'POST', body: formData }).then(d => { clearApiCache('banners'); return d; }),
  updateBanner: (id, data) => request(`/admin/banners/${id}`, { method: 'PUT', body: data }).then(d => { clearApiCache('banners'); return d; }),
  reorderBanners: (order) => request('/admin/banners-reorder', { method: 'PUT', body: { order } }).then(d => { clearApiCache('banners'); return d; }),
  deleteBanner: (id) => request(`/admin/banners/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('banners'); return d; }),
  // Blogs
  getBlogs: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/blogs/admin/all?${query}`);
  },
  getBlog: (id) => request(`/blogs/admin/${id}`),
  createBlog: (formData) => request('/blogs/admin', { method: 'POST', body: formData }).then(d => { clearApiCache('blogs'); clearApiCache('blog'); return d; }),
  updateBlog: (id, formData) => request(`/blogs/admin/${id}`, { method: 'PUT', body: formData }).then(d => { clearApiCache('blogs'); clearApiCache('blog'); return d; }),
  toggleBlogStatus: (id) => request(`/blogs/admin/${id}/toggle`, { method: 'PUT' }).then(d => { clearApiCache('blogs'); clearApiCache('blog'); return d; }),
  deleteBlog: (id) => request(`/blogs/admin/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('blogs'); clearApiCache('blog'); return d; }),
  // Activity Log
  getActivityLog: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/activity-log?${query}`);
  },
  // Site Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: data }),
};

// Site Settings (public)
export const settingsAPI = {
  get: () => request('/settings'),
};

// Banners (public)
export const bannersAPI = {
  // alwaysRevalidate ensures the home page picks up new uploads / edits made
  // in the admin panel within one network round-trip, instead of waiting
  // for the 5-minute TTL to expire. Callers can pass an onFresh callback to
  // re-render when the background revalidation returns different data.
  getActive: ({ onFresh } = {}) =>
    swr('banners:active', () => request('/banners'), CACHE_TTL.medium, { alwaysRevalidate: true, onFresh }),
};

// Blogs (public)
export const blogsAPI = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return swr(`blogs:${query}`, () => request(`/blogs?${query}`), CACHE_TTL.short);
  },
  getBySlug: (slug) =>
    swr(`blog:${slug}`, () => request(`/blogs/${slug}`), CACHE_TTL.short),
  getCategories: () =>
    swr('blogCategories', () => request('/blogs/categories'), CACHE_TTL.medium),
};

// Content Admin API
export const subAdminAPI = {
  // Banners
  getBanners: () => request('/content-admin/banners'),
  createBanner: (formData) => request('/content-admin/banners', { method: 'POST', body: formData }).then(d => { clearApiCache('banners'); return d; }),
  updateBanner: (id, data) => request(`/content-admin/banners/${id}`, { method: 'PUT', body: data }).then(d => { clearApiCache('banners'); return d; }),
  reorderBanners: (order) => request('/content-admin/banners-reorder', { method: 'PUT', body: { order } }).then(d => { clearApiCache('banners'); return d; }),
  deleteBanner: (id) => request(`/content-admin/banners/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('banners'); return d; }),
  // FAQs
  getFAQs: () => request('/faqs/admin/all'),
  createFAQ: (data) => request('/faqs/admin', { method: 'POST', body: data }).then(d => { clearApiCache('faqs'); return d; }),
  updateFAQ: (id, data) => request(`/faqs/admin/${id}`, { method: 'PUT', body: data }).then(d => { clearApiCache('faqs'); return d; }),
  deleteFAQ: (id) => request(`/faqs/admin/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('faqs'); return d; }),
  // Page Content
  getPages: () => request('/pages/admin/all'),
  updatePage: (key, data) => request(`/pages/admin/${key}`, { method: 'PUT', body: data }).then(d => { clearApiCache('page'); return d; }),
  uploadContentImage: (formData) => request('/content-admin/upload-image', { method: 'POST', body: formData }),
  // Blogs
  getBlogs: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/blogs/admin/all?${query}`);
  },
  getBlog: (id) => request(`/blogs/admin/${id}`),
  createBlog: (formData) => request('/blogs/admin', { method: 'POST', body: formData }).then(d => { clearApiCache('blogs'); return d; }),
  updateBlog: (id, formData) => request(`/blogs/admin/${id}`, { method: 'PUT', body: formData }).then(d => { clearApiCache('blogs'); return d; }),
  toggleBlogStatus: (id) => request(`/blogs/admin/${id}/toggle`, { method: 'PUT' }).then(d => { clearApiCache('blogs'); return d; }),
  deleteBlog: (id) => request(`/blogs/admin/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('blogs'); return d; }),
  // About
  getAbout: () => request('/about'),
  updateAbout: (data) => request('/about', { method: 'PUT', body: data }),
  uploadAboutCover: (formData) => request('/about/cover', { method: 'PUT', body: formData }),
  updateTeamMember: (index, data) => request(`/about/team/${index}`, { method: 'PUT', body: data }),
  uploadTeamImage: (index, formData) => request(`/about/team/${index}/image`, { method: 'PUT', body: formData }),
  addTeamMember: (data) => request('/about/team', { method: 'POST', body: data }),
  removeTeamMember: (index) => request(`/about/team/${index}`, { method: 'DELETE' }),
};

// Notifications
export const notificationsAPI = {
  /**
   * List notifications for a tab.
   *
   * Performance contract:
   * - Page 1 calls go through SWR: instant paint from cache, background
   *   revalidation, `onFresh(value)` fires only when the new payload differs.
   * - Pagination (`page > 1`) bypasses cache so "Load more" always fetches.
   * - `signal` lets the caller cancel in-flight requests when switching tabs.
   * - `ttl` lets the caller use a category-aware freshness window
   *   (e.g. 15s for orders, 2m for offers). Defaults to `CACHE_TTL.short`.
   */
  list: (params = {}, { onFresh, signal, ttl } = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null))
    ).toString();
    const url = `/notifications${query ? `?${query}` : ''}`;
    const pg = Number(params.page) || 1;
    if (pg !== 1) return request(url, { signal });
    const cat = params.category || 'all';
    return swr(
      `notifications:${cat}`,
      () => request(url, { signal }),
      ttl ?? CACHE_TTL.short,
      { alwaysRevalidate: true, onFresh }
    );
  },
  unreadCount: () => request('/notifications/unread-count'),
  // NOTE: mutations no longer clear the SWR cache. The page performs
  // surgical, per-tab optimistic patches via `writeApiCache` so unrelated
  // tabs keep their warm cache.
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: (category) =>
    request('/notifications/mark-all-read', { method: 'PATCH', body: category ? { category } : {} }),
  remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  clearAll: (category) =>
    request(`/notifications${category ? `?category=${encodeURIComponent(category)}` : ''}`, { method: 'DELETE' }),
  // Admin
  broadcast: (data) => request('/notifications/broadcast', { method: 'POST', body: data }),
  sendToUser: (data) => request('/notifications', { method: 'POST', body: data }),
};
