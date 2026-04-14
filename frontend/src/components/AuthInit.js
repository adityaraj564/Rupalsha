'use client';

import { useEffect } from 'react';
import { useAuthStore, useCartStore, useWishlistStore } from '@/lib/store';

export default function AuthInit() {
  const init = useAuthStore((s) => s.init);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      fetchWishlist();
    }
  }, [isAuthenticated, fetchCart, fetchWishlist]);

  return null;
}
