import { create } from 'zustand';
import { authAPI, cartAPI, wishlistAPI } from '../lib/api';

// Auth Store
export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  init: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rupalsha_token') : null;
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { user } = await authAPI.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('rupalsha_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    const { token, user } = await authAPI.login(credentials);
    localStorage.setItem('rupalsha_token', token);
    set({ user, isAuthenticated: true });
    return user;
  },

  register: async (data) => {
    const { token, user } = await authAPI.register(data);
    localStorage.setItem('rupalsha_token', token);
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: () => {
    localStorage.removeItem('rupalsha_token');
    set({ user: null, isAuthenticated: false });
    useCartStore.getState().clearLocal();
  },

  updateUser: (userData) => {
    set((state) => ({ user: { ...state.user, ...userData } }));
  },
}));

// Cart Store
export const useCartStore = create((set, get) => ({
  items: [],
  isLoading: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const { cart } = await cartAPI.get();
      set({ items: cart.items || [], isLoading: false });
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

  fetchWishlist: async () => {
    try {
      const { wishlist } = await wishlistAPI.get();
      set({ items: wishlist || [] });
    } catch {
      // ignore
    }
  },

  addItem: async (productId) => {
    await wishlistAPI.add(productId);
    await get().fetchWishlist();
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
