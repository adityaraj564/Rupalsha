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
      localStorage.removeItem('rupalsha_cart_cache');
      localStorage.removeItem('rupalsha_wishlist_cache');
      localStorage.removeItem('rupalsha_orders_cache');
      localStorage.removeItem('rupalsha_notifications_cache');
    } catch {}
    set({ user: null, isAuthenticated: false, isLoading: false });
    useCartStore.getState().clearLocal();
    useWishlistStore.getState().clearLocal?.();
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
// --------------------------------------------------------------------------
// Persists items to localStorage so the cart paints instantly on refresh /
// navigation. fetchCart never flips isLoading=true when items are already in
// state — that prevents the dreaded "skeleton flash" on every cart visit.
// Mutations (add/update/remove) are optimistic: state is updated first, the
// server call confirms (or reverts on error) afterwards.
const CART_CACHE_KEY = 'rupalsha_cart_cache';

const readCachedCart = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCachedCart = (items) => {
  if (typeof window === 'undefined') return;
  try {
    if (items && items.length) localStorage.setItem(CART_CACHE_KEY, JSON.stringify(items));
    else localStorage.removeItem(CART_CACHE_KEY);
  } catch {}
};

export const useCartStore = create((set, get) => ({
  items: [],
  isLoading: false,
  _hydrated: false,
  _lastFetched: 0,

  // Pulls cached items into state (idempotent). Safe to call from useEffect.
  hydrate: () => {
    if (get()._hydrated) return;
    const cached = readCachedCart();
    set({ items: cached, _hydrated: true });
  },

  fetchCart: async (force = false) => {
    // Hydrate from cache first so the UI paints with the previous cart while
    // the network request resolves.
    if (!get()._hydrated) get().hydrate();

    const now = Date.now();
    if (!force && now - get()._lastFetched < 30000) return;

    // Only show the skeleton on a true cold start (no cached items).
    const cold = get().items.length === 0;
    try {
      if (cold) set({ isLoading: true });
      const { cart } = await cartAPI.get();
      const items = cart.items || [];
      set({ items, isLoading: false, _lastFetched: now });
      writeCachedCart(items);
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, size, quantity = 1) => {
    const { cart } = await cartAPI.add({ productId, size, quantity });
    const items = cart.items || [];
    set({ items });
    writeCachedCart(items);
  },

  updateItem: async (itemId, quantity) => {
    // Optimistic: update locally first so the +/- buttons feel instant.
    const prev = get().items;
    const optimistic = prev.map((it) => (it._id === itemId ? { ...it, quantity } : it));
    set({ items: optimistic });
    writeCachedCart(optimistic);
    try {
      const { cart } = await cartAPI.update({ itemId, quantity });
      const items = cart.items || [];
      set({ items });
      writeCachedCart(items);
    } catch (err) {
      // Revert on failure.
      set({ items: prev });
      writeCachedCart(prev);
      throw err;
    }
  },

  removeItem: async (itemId) => {
    const prev = get().items;
    const optimistic = prev.filter((it) => it._id !== itemId);
    set({ items: optimistic });
    writeCachedCart(optimistic);
    try {
      const { cart } = await cartAPI.remove(itemId);
      const items = cart.items || [];
      set({ items });
      writeCachedCart(items);
    } catch (err) {
      set({ items: prev });
      writeCachedCart(prev);
      throw err;
    }
  },

  clearCart: async () => {
    await cartAPI.clear();
    set({ items: [] });
    writeCachedCart([]);
  },

  clearLocal: () => {
    set({ items: [], _hydrated: false });
    writeCachedCart([]);
  },

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
// --------------------------------------------------------------------------
// Same instant-paint pattern as the cart: cached items in localStorage,
// optimistic mutations. The heart icon flips the moment the user clicks it,
// the server call follows, and we revert if it fails.
const WISHLIST_CACHE_KEY = 'rupalsha_wishlist_cache';

const readCachedWishlist = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCachedWishlist = (items) => {
  if (typeof window === 'undefined') return;
  try {
    if (items && items.length) localStorage.setItem(WISHLIST_CACHE_KEY, JSON.stringify(items));
    else localStorage.removeItem(WISHLIST_CACHE_KEY);
  } catch {}
};

export const useWishlistStore = create((set, get) => ({
  items: [],
  _hydrated: false,
  _lastFetched: 0,

  hydrate: () => {
    if (get()._hydrated) return;
    set({ items: readCachedWishlist(), _hydrated: true });
  },

  fetchWishlist: async (force = false) => {
    if (!get()._hydrated) get().hydrate();
    const now = Date.now();
    if (!force && now - get()._lastFetched < 30000) return;
    try {
      const { wishlist } = await wishlistAPI.get();
      const items = wishlist || [];
      set({ items, _lastFetched: now });
      writeCachedWishlist(items);
    } catch {
      // ignore — keep showing cached items
    }
  },

  // Optimistic add: stamp a placeholder with just `_id` into items so
  // `isInWishlist` returns true immediately (instant heart fill). The full
  // product object arrives once the wishlist refetch completes.
  addItem: async (productId) => {
    const prev = get().items;
    if (prev.some((it) => it._id === productId)) return; // already in
    const optimistic = [...prev, { _id: productId, _optimistic: true }];
    set({ items: optimistic });
    writeCachedWishlist(optimistic);
    try {
      await wishlistAPI.add(productId);
      // Background refresh hydrates the optimistic item with full data.
      get().fetchWishlist(true);
    } catch (err) {
      set({ items: prev });
      writeCachedWishlist(prev);
      throw err;
    }
  },

  removeItem: async (productId) => {
    const prev = get().items;
    const optimistic = prev.filter((item) => item._id !== productId);
    set({ items: optimistic });
    writeCachedWishlist(optimistic);
    try {
      await wishlistAPI.remove(productId);
    } catch (err) {
      set({ items: prev });
      writeCachedWishlist(prev);
      throw err;
    }
  },

  isInWishlist: (productId) => {
    return get().items.some((item) => item._id === productId);
  },

  clearLocal: () => {
    set({ items: [], _hydrated: false });
    writeCachedWishlist([]);
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
