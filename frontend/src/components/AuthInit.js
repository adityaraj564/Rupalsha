'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCartStore, useWishlistStore } from '@/lib/store';

export default function AuthInit() {
  const init = useAuthStore((s) => s.init);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    init();
  }, [init]);

  // Redirect admin users away from customer pages to /admin
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'admin') {
      const isOnAdminPage = pathname.startsWith('/admin');
      if (!isOnAdminPage) {
        router.replace('/admin');
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      fetchWishlist();
    }
  }, [isAuthenticated, fetchCart, fetchWishlist]);

  return null;
}
