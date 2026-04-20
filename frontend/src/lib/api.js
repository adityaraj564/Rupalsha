const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Client-side response cache (SWR-style) ──
const responseCache = new Map();
const CACHE_TTL = {
  short: 60 * 1000,    // 1 min - products, search results
  medium: 5 * 60 * 1000, // 5 min - categories, about page
  long: 15 * 60 * 1000,  // 15 min - rarely changing data
};

const getCached = (key) => {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = (key, value, ttl = CACHE_TTL.short) => {
  // Limit cache size to prevent memory issues
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(key, { value, expiresAt: Date.now() + ttl });
};

export const clearApiCache = (prefix) => {
  if (!prefix) { responseCache.clear(); return; }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) responseCache.delete(key);
  }
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

const request = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error || data.errors?.[0]?.msg || 'Something went wrong', res.status);
  }

  return data;
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
  addAddress: (data) => request('/auth/addresses', { method: 'POST', body: data }),
  updateAddress: (id, data) => request(`/auth/addresses/${id}`, { method: 'PUT', body: data }),
  deleteAddress: (id) => request(`/auth/addresses/${id}`, { method: 'DELETE' }),
};

// Products
export const productsAPI = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    const cacheKey = `products:${query}`;
    const cached = getCached(cacheKey);
    if (cached) return Promise.resolve(cached);
    return request(`/products?${query}`).then(data => { setCache(cacheKey, data, CACHE_TTL.short); return data; });
  },
  getBySlug: (slug) => {
    const cacheKey = `product:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) return Promise.resolve(cached);
    return request(`/products/${slug}`).then(data => { setCache(cacheKey, data, CACHE_TTL.short); return data; });
  },
  getSimilar: (slug, limit = 8) => {
    const cacheKey = `similar:${slug}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return Promise.resolve(cached);
    return request(`/products/${slug}/similar?limit=${limit}`).then(data => { setCache(cacheKey, data, CACHE_TTL.medium); return data; });
  },
  getCategories: () => {
    const cached = getCached('productCategories');
    if (cached) return Promise.resolve(cached);
    return request('/products/categories').then(data => { setCache('productCategories', data, CACHE_TTL.medium); return data; });
  },
};

// Categories
export const categoriesAPI = {
  getTree: () => {
    const cached = getCached('categoriesTree');
    if (cached) return Promise.resolve(cached);
    return request('/categories').then(data => { setCache('categoriesTree', data, CACHE_TTL.medium); return data; });
  },
  getFlat: (params) => {
    const query = new URLSearchParams(params).toString();
    const cacheKey = `categoriesFlat:${query}`;
    const cached = getCached(cacheKey);
    if (cached) return Promise.resolve(cached);
    return request(`/categories/flat?${query}`).then(data => { setCache(cacheKey, data, CACHE_TTL.medium); return data; });
  },
  getBySlug: (slug) => {
    const cacheKey = `category:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) return Promise.resolve(cached);
    return request(`/categories/${slug}`).then(data => { setCache(cacheKey, data, CACHE_TTL.medium); return data; });
  },
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
  create: (data) => request('/orders', { method: 'POST', body: data }),
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders?${query}`);
  },
  getById: (id) => request(`/orders/${id}`),
  cancel: (id, reason) => request(`/orders/${id}/cancel`, { method: 'PUT', body: { reason } }),
  returnOrder: (id, reason) => request(`/orders/${id}/return`, { method: 'PUT', body: { reason } }),
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
  getActive: () => {
    const cached = getCached('couponsActive');
    if (cached) return Promise.resolve(cached);
    return request('/coupons/active', { auth: false }).then(data => { setCache('couponsActive', data, CACHE_TTL.medium); return data; });
  },
};

// Contact
export const contactAPI = {
  send: (data) => request('/contact', { method: 'POST', body: data }),
};

// About
export const aboutAPI = {
  get: () => {
    const cached = getCached('about');
    if (cached) return Promise.resolve(cached);
    return request('/about').then(data => { setCache('about', data, CACHE_TTL.long); return data; });
  },
  update: (data) => request('/about', { method: 'PUT', body: data }),
  uploadCover: (formData) => request('/about/cover', { method: 'PUT', body: formData }),
  updateTeamMember: (index, data) => request(`/about/team/${index}`, { method: 'PUT', body: data }),
  uploadTeamImage: (index, formData) => request(`/about/team/${index}/image`, { method: 'PUT', body: formData }),
  addTeamMember: (data) => request('/about/team', { method: 'POST', body: data }),
  removeTeamMember: (index) => request(`/about/team/${index}`, { method: 'DELETE' }),
};

// Admin
export const adminAPI = {
  getDashboard: () => request('/admin/dashboard'),
  // Products
  getProducts: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/products?${query}`);
  },
  createProduct: (formData) => request('/admin/products', { method: 'POST', body: formData }).then(d => { clearApiCache('products'); clearApiCache('product'); return d; }),
  updateProduct: (id, formData) => request(`/admin/products/${id}`, { method: 'PUT', body: formData }).then(d => { clearApiCache('products'); clearApiCache('product'); return d; }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('products'); clearApiCache('product'); return d; }),
  // Inventory
  getInventory: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/inventory?${query}`);
  },
  // Orders
  getOrders: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/orders?${query}`);
  },
  updateOrderStatus: (id, data) => request(`/admin/orders/${id}/status`, { method: 'PUT', body: data }),
  deleteOrder: (id) => request(`/admin/orders/${id}`, { method: 'DELETE' }),
  // Users
  getUsers: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users?${query}`);
  },
  toggleBlockUser: (id) => request(`/admin/users/${id}/block`, { method: 'PUT' }),
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
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }).then(d => { clearApiCache('categories'); return d; }),
};
