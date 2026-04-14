const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    return request(`/products?${query}`);
  },
  getBySlug: (slug) => request(`/products/${slug}`),
  getCategories: () => request('/products/categories'),
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
  create: (data) => request('/reviews', { method: 'POST', body: data }),
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
  getActive: () => request('/coupons/active', { auth: false }),
};

// Contact
export const contactAPI = {
  send: (data) => request('/contact', { method: 'POST', body: data }),
};

// About
export const aboutAPI = {
  get: () => request('/about'),
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
  createProduct: (formData) => request('/admin/products', { method: 'POST', body: formData }),
  updateProduct: (id, formData) => request(`/admin/products/${id}`, { method: 'PUT', body: formData }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
  // Orders
  getOrders: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/orders?${query}`);
  },
  updateOrderStatus: (id, data) => request(`/admin/orders/${id}/status`, { method: 'PUT', body: data }),
  // Users
  getUsers: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users?${query}`);
  },
  toggleBlockUser: (id) => request(`/admin/users/${id}/block`, { method: 'PUT' }),
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
};
