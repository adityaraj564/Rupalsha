'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiGrid, FiPackage, FiShoppingCart, FiUsers, FiStar, FiTag, FiUser, FiLogOut, FiChevronDown, FiInfo } from 'react-icons/fi';
import { useAuthStore } from '@/lib/store';
import LoadingSpinner from '@/components/LoadingSpinner';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: FiGrid },
  { href: '/admin/products', label: 'Products', icon: FiPackage },
  { href: '/admin/orders', label: 'Orders', icon: FiShoppingCart },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
  { href: '/admin/reviews', label: 'Reviews', icon: FiStar },
  { href: '/admin/coupons', label: 'Coupons', icon: FiTag },
  { href: '/admin/about', label: 'About Page', icon: FiInfo },
];

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
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

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-brand-green text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl font-bold">Rupalsha Admin</h1>
          </div>
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
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-2 z-50">
                <Link
                  href="/admin/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setProfileOpen(false)}
                >
                  <FiUser size={16} /> Edit Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <FiLogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
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
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Mobile Nav */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40">
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
