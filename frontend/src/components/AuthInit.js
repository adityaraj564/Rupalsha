'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCartStore, useWishlistStore, useThemeStore } from '@/lib/store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AuthInit() {
  const init = useAuthStore((s) => s.init);
  const initTheme = useThemeStore((s) => s.init);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    init();
    initTheme();
  }, [init, initTheme]);

  // Keep-alive ping to prevent Render free-tier cold starts (every 4 min)
  useEffect(() => {
    const ping = () => fetch(`${API_URL}/health`, { method: 'GET' }).catch(() => {});
    // Ping immediately on app load to wake up the server
    ping();
    const interval = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
      Promise.all([fetchCart(), fetchWishlist()]);
    }
  }, [isAuthenticated, fetchCart, fetchWishlist]);

  return null;
}
