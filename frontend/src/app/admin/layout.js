'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiGrid, FiPackage, FiShoppingCart, FiUsers, FiStar, FiTag, FiUser, FiLogOut, FiChevronDown, FiInfo, FiLayers, FiClipboard, FiSun, FiMoon, FiImage, FiFileText, FiActivity, FiRotateCcw, FiCreditCard, FiSettings, FiTrendingUp, FiMenu, FiX } from 'react-icons/fi';
import { useAuthStore, useThemeStore, useAuthModalStore } from '@/lib/store';
import { AdminDashboardSkeleton } from '@/components/Skeleton';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: FiGrid },
  { href: '/admin/products', label: 'Products', icon: FiPackage },
  { href: '/admin/inventory', label: 'Inventory', icon: FiClipboard },
  { href: '/admin/calculator', label: 'Pricing Calc', icon: FiTrendingUp },
  { href: '/admin/categories', label: 'Categories', icon: FiLayers },
  { href: '/admin/orders', label: 'Orders', icon: FiShoppingCart },
  { href: '/admin/returns', label: 'Returns', icon: FiRotateCcw },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
  { href: '/admin/wallets', label: 'Wallets', icon: FiCreditCard },
  { href: '/admin/reviews', label: 'Reviews', icon: FiStar },
  { href: '/admin/coupons', label: 'Coupons', icon: FiTag },
  { href: '/admin/banners', label: 'Banners', icon: FiImage },
  { href: '/admin/blogs', label: 'Blog Posts', icon: FiFileText },
  { href: '/admin/about', label: 'About Page', icon: FiInfo },
  { href: '/admin/activity', label: 'Activity Log', icon: FiActivity },
  { href: '/admin/settings', label: 'Settings', icon: FiSettings },
];

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef(null);
  // One-shot guard: prevents the redirect-loop seen when /auth/login
  // bounced back here while React was still re-rendering after logout.
  const redirectedRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close the mobile drawer whenever the user navigates — including
  // tapping the link for the page they are already on.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Send the user home and pop the auth modal there. Pushing them to
  // /auth/login (which itself bounces back) caused the URL to flip
  // between /admin and /auth/login many times per second on logout.
  const handleLogout = () => {
    redirectedRef.current = true; // suppress the auth-gate effect below
    logout();
    router.replace('/');
  };

  useLayoutEffect(() => {
    if (isLoading) return;
    const allowed = isAuthenticated && user?.role === 'admin';
    if (allowed) {
      redirectedRef.current = false;
      return;
    }
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace('/');
    // Prompt the user to sign back in without forcing a route
    // dedicated to login (which the rest of the app no longer has).
    useAuthModalStore.getState().open('login');
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) return <AdminDashboardSkeleton />;
  // Keep showing the skeleton while the redirect lands so the page
  // never flashes blank — `return null` produced the white screen.
  if (!isAuthenticated || user?.role !== 'admin') return <AdminDashboardSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-brand-green text-white">
        <div className="w-full px-4 sm:px-6 lg:px-[50px] py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <FiMenu size={22} />
            </button>
            <h1 className="font-serif text-xl font-bold">Rupalsha Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
            <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 text-sm text-gray-200 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <FiUser size={16} />
              </div>
              <span className="hidden sm:inline">{user?.name || 'Admin'}</span>
              <FiChevronDown size={14} className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 py-2 z-50">
                <Link
                  href="/admin/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setProfileOpen(false)}
                >
                  <FiUser size={16} /> Edit Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                >
                  <FiLogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-[50px] py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <nav className="space-y-1 sticky top-6">
              {ADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-brand-green text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 z-50"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setMobileMenuOpen(false)}
              />
              <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-gray-900 shadow-xl flex flex-col animate-slide-down">
                <div className="flex items-center justify-between px-4 py-4 bg-brand-green text-white">
                  <span className="font-serif text-lg font-bold">Admin Menu</span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="p-2 -mr-2 rounded-lg hover:bg-white/20"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                  {ADMIN_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? 'bg-brand-green text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </aside>
            </div>
          )}

          {/* Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
