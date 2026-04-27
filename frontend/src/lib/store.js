import { create } from 'zustand';
import { authAPI, cartAPI, wishlistAPI } from '../lib/api';

const USER_CACHE_KEY = 'rupalsha_user_cache';

// Read cached user from localStorage (used for instant rehydrate inside init).
const readCachedUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (user) => {
  if (typeof window === 'undefined') return;
  try {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch {}
};

// Auth Store
// Initial state matches between SSR and CSR (no window access). The instant
// rehydrate happens inside init() which runs synchronously up to the first
// await — this avoids hydration mismatches while still painting cached data
// on the very next render.
export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  init: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rupalsha_token') : null;
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      writeCachedUser(null);
      return;
    }

    // ── Synchronous: paint cached user immediately so the UI doesn't flicker.
    const cached = readCachedUser();
    if (cached) {
      set({ user: cached, isAuthenticated: true, isLoading: false });
    }

    // ── Background: revalidate against /me; update cache when fresh data arrives.
    try {
      const { user } = await authAPI.getMe();
      writeCachedUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('rupalsha_token');
      writeCachedUser(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    const { token, user } = await authAPI.login(credentials);
    localStorage.setItem('rupalsha_token', token);
    writeCachedUser(user);
    set({ user, isAuthenticated: true, isLoading: false });
    return user;
  },

  loginWithToken: (token, user) => {
    localStorage.setItem('rupalsha_token', token);
    writeCachedUser(user);
    set({ user, isAuthenticated: true, isLoading: false });
    return user;
  },

  register: async (data) => {
    const { token, user } = await authAPI.register(data);
    localStorage.setItem('rupalsha_token', token);
    writeCachedUser(user);
    set({ user, isAuthenticated: true, isLoading: false });
    return user;
  },

  logout: () => {
    localStorage.removeItem('rupalsha_token');
    writeCachedUser(null);
    // Clear all per-user caches so the next user doesn't see stale data.
    try {
      localStorage.removeItem('rupalsha_profile_stats');
      localStorage.removeItem('rupalsha_wallet_cache');
      localStorage.removeItem('rupalsha_unread_count');
    } catch {}
    set({ user: null, isAuthenticated: false, isLoading: false });
    useCartStore.getState().clearLocal();
  },

  updateUser: (userData) => {
    set((state) => {
      const merged = { ...state.user, ...userData };
      writeCachedUser(merged);
      return { user: merged };
    });
  },
}));

// Cart Store
export const useCartStore = create((set, get) => ({
  items: [],
  isLoading: false,
  _lastFetched: 0,

  fetchCart: async (force = false) => {
    const now = Date.now();
    if (!force && now - get()._lastFetched < 30000) return;
    try {
      set({ isLoading: true });
      const { cart } = await cartAPI.get();
      set({ items: cart.items || [], isLoading: false, _lastFetched: now });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, size, quantity = 1) => {
    const { cart } = await cartAPI.add({ productId, size, quantity });
    set({ items: cart.items || [] });
  },

  updateItem: async (itemId, quantity) => {
    const { cart } = await cartAPI.update({ itemId, quantity });
    set({ items: cart.items || [] });
  },

  removeItem: async (itemId) => {
    const { cart } = await cartAPI.remove(itemId);
    set({ items: cart.items || [] });
  },

  clearCart: async () => {
    await cartAPI.clear();
    set({ items: [] });
  },

  clearLocal: () => set({ items: [] }),

  getTotal: () => {
    return get().items.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);
  },

  getCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

// Wishlist Store
export const useWishlistStore = create((set, get) => ({
  items: [],
  _lastFetched: 0,

  fetchWishlist: async (force = false) => {
    const now = Date.now();
    if (!force && now - get()._lastFetched < 30000) return;
    try {
      const { wishlist } = await wishlistAPI.get();
      set({ items: wishlist || [], _lastFetched: now });
    } catch {
      // ignore
    }
  },

  addItem: async (productId) => {
    await wishlistAPI.add(productId);
    await get().fetchWishlist(true);
  },

  removeItem: async (productId) => {
    await wishlistAPI.remove(productId);
    set((state) => ({
      items: state.items.filter((item) => item._id !== productId),
    }));
  },

  isInWishlist: (productId) => {
    return get().items.some((item) => item._id === productId);
  },
}));

// Theme Store
export const useThemeStore = create((set, get) => ({
  isDark: false,

  init: () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('rupalsha_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : prefersDark;
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    set({ isDark });
  },

  toggle: () => {
    const next = !get().isDark;
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('rupalsha_theme', next ? 'dark' : 'light');
    set({ isDark: next });
  },
}));
