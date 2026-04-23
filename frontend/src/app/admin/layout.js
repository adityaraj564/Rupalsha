'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiGrid, FiPackage, FiShoppingCart, FiUsers, FiStar, FiTag, FiUser, FiLogOut, FiChevronDown, FiInfo, FiLayers, FiClipboard, FiSun, FiMoon, FiImage, FiFileText, FiActivity, FiRotateCcw } from 'react-icons/fi';
import { useAuthStore, useThemeStore } from '@/lib/store';
import { AdminDashboardSkeleton } from '@/components/Skeleton';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: FiGrid },
  { href: '/admin/products', label: 'Products', icon: FiPackage },
  { href: '/admin/inventory', label: 'Inventory', icon: FiClipboard },
  { href: '/admin/categories', label: 'Categories', icon: FiLayers },
  { href: '/admin/orders', label: 'Orders', icon: FiShoppingCart },
  { href: '/admin/returns', label: 'Returns', icon: FiRotateCcw },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
  { href: '/admin/reviews', label: 'Reviews', icon: FiStar },
  { href: '/admin/coupons', label: 'Coupons', icon: FiTag },
  { href: '/admin/banners', label: 'Banners', icon: FiImage },
  { href: '/admin/blogs', label: 'Blog Posts', icon: FiFileText },
  { href: '/admin/about', label: 'About Page', icon: FiInfo },
  { href: '/admin/activity', label: 'Activity Log', icon: FiActivity },
];

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) return <AdminDashboardSkeleton />;
  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-brand-green text-white">
        <div className="w-full px-4 sm:px-6 lg:px-[50px] py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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

          {/* Mobile Nav */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 z-40">
            <div className="flex">
              {ADMIN_NAV.slice(0, 5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs ${
                    pathname === item.href ? 'text-brand-green' : 'text-gray-400'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 min-w-0 pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
