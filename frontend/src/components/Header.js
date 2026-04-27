'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { FiSearch, FiHeart, FiShoppingBag, FiUser, FiMenu, FiX, FiSun, FiMoon, FiLogOut, FiCreditCard } from 'react-icons/fi';
import { useAuthStore, useCartStore, useWishlistStore, useThemeStore } from '@/lib/store';
import NotificationBell from './NotificationBell';
import { couponsAPI } from '@/lib/api';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products?featured=true', label: 'New Arrival' },
  { href: '/products?trending=true', label: 'Trending' },
  { href: '/products', label: 'Shop All' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About Us' },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [currentCoupon, setCurrentCoupon] = useState(0);
  const [slideAnim, setSlideAnim] = useState(false);
  const searchRef = useRef(null);
  const searchBarRef = useRef(null);
  const searchBtnRef = useRef(null);
  const profileRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  const [showThemeTip, setShowThemeTip] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const { isAuthenticated, user, logout } = useAuthStore();
  const cartCount = useCartStore((s) => s.getCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { isDark, toggle: toggleTheme } = useThemeStore();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Redirect content admin to their panel — allow help, about, blog for checking changes
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'subadmin') return;
    const allowed = ['/content-admin', '/auth/', '/help', '/about', '/blog'];
    if (allowed.some((p) => pathname.startsWith(p))) return;
    router.push('/content-admin');
  }, [isAuthenticated, user, pathname, router]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (searchOpen && searchBarRef.current && !searchBarRef.current.contains(e.target) && searchBtnRef.current && !searchBtnRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  // Close search on scroll
  useEffect(() => {
    if (!searchOpen) return;
    const handleScroll = () => {
      setSearchOpen(false);
      setSearchQuery('');
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchOpen]);

  // Show night mode tooltip for first-time visitors (only in light mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('rupalsha_theme_tip');
    if (!seen && !isDark) {
      const timer = setTimeout(() => setShowThemeTip(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [isDark]);

  useEffect(() => {
    let cancelled = false;
    // Skip if we already have coupons (prevents re-fetch on every mount)
    if (coupons.length > 0) return;
    couponsAPI.getActive().then((data) => {
      if (!cancelled && data?.length) setCoupons(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (coupons.length <= 1) return;
    const interval = setInterval(() => {
      setSlideAnim(true);
      setTimeout(() => {
        setCurrentCoupon((prev) => (prev + 1) % coupons.length);
        setSlideAnim(false);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [coupons.length]);

  // Debounced live search: triggers after 2+ characters
  useEffect(() => {
    if (!searchOpen) return;
    const trimmed = searchQuery.trim();
    const timer = setTimeout(() => {
      if (trimmed.length >= 2) {
        router.push(`/products?search=${encodeURIComponent(trimmed)}`);
        addToSearchHistory(trimmed);
      } else if (trimmed.length === 0) {
        // When search is fully cleared, show all products
        router.push('/products');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, router]);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rupalsha_search_history') || '[]');
      if (Array.isArray(saved)) setSearchHistory(saved);
    } catch {}
  }, []);

  const addToSearchHistory = (term) => {
    setSearchHistory((prev) => {
      // Remove duplicate if exists, add to end, cap at 10 (FIFO)
      const filtered = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
      const updated = [...filtered, term].slice(-10);
      localStorage.setItem('rupalsha_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromSearchHistory = (term) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((s) => s !== term);
      localStorage.setItem('rupalsha_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('rupalsha_search_history');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Live search handles it — form submit just prevents page reload
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/content-admin');
  const isContentAdminBrowsing = user?.role === 'subadmin' && isAuthenticated && !isAdmin;

  if (isAdmin) return null;

  // Minimal header for content admin browsing help/about/blog pages
  if (isContentAdminBrowsing) {
    return (
      <header className="sticky top-0 z-50 bg-brand-cream dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="w-full px-4 sm:px-6 lg:px-[50px]">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/content-admin" className="flex-shrink-0 flex items-center gap-2">
              <Image src="/rupalshaLogo.png" alt="Rupalsha Logo" width={70} height={70} className="rounded-full translate-y-1" priority />
              <h1 className="hidden md:block font-serif text-2xl md:text-3xl font-bold tracking-wide -ml-1 text-brand-green dark:text-[#F8F0E8] [text-shadow:1px_1px_2px_rgba(200,169,81,0.4)]">RUPALSHA</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/content-admin" className="text-sm font-medium text-brand-gold hover:text-brand-green transition-colors flex items-center gap-1">
                ← Back to Content Admin
              </Link>
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(!profileOpen)} className="p-2 hover:text-brand-green transition-colors" aria-label="Profile">
                  <FiUser size={20} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <Link href="/content-admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-gold font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <FiUser size={16} /> Content Admin Panel
                    </Link>
                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                    <button onClick={() => { toggleTheme(); setProfileOpen(false); }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left">
                      {isDark ? <FiSun size={16} /> : <FiMoon size={16} />} {isDark ? 'Light Mode' : 'Night Mode'}
                    </button>
                    <button onClick={() => { logout(); setProfileOpen(false); router.push('/auth/login'); }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors w-full text-left">
                      <FiLogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const formatCoupon = (c) => {
    const off = c.discountType === 'percentage' ? `${c.discountValue}% off` : `₹${c.discountValue} off`;
    const min = c.minOrderAmount > 0 ? ` on orders above ₹${c.minOrderAmount}` : '';
    return { text: c.description || `${off}${min}`, code: c.code };
  };

  const isInvoicePage = pathname?.includes('/invoice');

  return (
    <>
      {/* Announcement Bar — hidden on printable invoice pages */}
      {!isInvoicePage && (
      <div className="bg-brand-green text-white text-center py-2 text-xs md:text-sm font-sans tracking-wide overflow-hidden h-8 flex items-center justify-center print:hidden">
        {coupons.length > 0 ? (
          <span
            className={`inline-block transition-all duration-300 ${
              slideAnim ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
            }`}
          >
            {formatCoupon(coupons[currentCoupon]).text} | Use code{' '}
            <span className="font-semibold text-brand-gold">{coupons[currentCoupon].code}</span>
          </span>
        ) : (
          <span>Free Shipping on orders above ₹999</span>
        )}
      </div>
      )}

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm' : 'bg-brand-cream dark:bg-gray-950'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-[50px]">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left: Mobile menu + Logo */}
            <div className="flex items-center gap-0">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1 -ml-3"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <Image
                src="/rupalshaLogo.png"
                alt="Rupalsha Logo"
                width={70}
                height={70}
                className="rounded-full translate-y-1"
                priority
              />
              <h1 className="hidden md:block font-serif text-2xl md:text-3xl font-bold tracking-wide -ml-1 text-brand-green dark:text-[#F8F0E8] [text-shadow:1px_1px_2px_rgba(200,169,81,0.4)]">
                RUPALSHA
              </h1>
            </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-brand-charcoal dark:text-gray-200 hover:text-brand-green transition-colors relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3 md:space-x-4">
              <button
                ref={searchBtnRef}
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 hover:text-brand-green transition-colors"
                aria-label="Search"
              >
                <FiSearch size={20} />
              </button>

              {isAuthenticated && (
                <Link
                  href="/wishlist"
                  className="p-2 hover:text-brand-green transition-colors relative hidden sm:block"
                >
                  <FiHeart size={20} />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Notification bell (renders only for logged-in customers) */}
              <div className="relative">
                <NotificationBell />
              </div>

              <Link
                href="/cart"
                className="p-2 hover:text-brand-green transition-colors relative"
              >
                <FiShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setProfileOpen(!profileOpen); if (showThemeTip) { setShowThemeTip(false); localStorage.setItem('rupalsha_theme_tip', '1'); } }}
                  className="p-2 hover:text-brand-green transition-colors"
                  aria-label="Profile"
                >
                  <FiUser size={20} />
                </button>

                {/* Night mode tooltip for first-time users */}
                {showThemeTip && (
                  <div className="absolute right-0 mt-2 w-56 z-50 animate-fade-in">
                    <div className="relative bg-brand-green text-white text-sm rounded-xl px-4 py-3 shadow-lg">
                      <div className="absolute -top-2 right-4 w-4 h-4 bg-brand-green rotate-45 rounded-sm" />
                      <div className="relative flex items-start gap-2">
                        <FiMoon className="mt-0.5 flex-shrink-0 text-brand-gold" size={16} />
                        <div>
                          <p className="font-medium">Try Night Mode!</p>
                          <p className="text-gray-300 text-xs mt-0.5">Tap your profile icon to switch to dark theme.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setShowThemeTip(false); localStorage.setItem('rupalsha_theme_tip', '1'); }}
                        className="absolute top-1.5 right-2 text-gray-300 hover:text-white"
                        aria-label="Dismiss"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    {isAuthenticated ? (
                      <>
                        {user?.role === 'admin' && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-green dark:text-brand-gold font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FiUser size={16} /> Admin Panel
                          </Link>
                        )}
                        {user?.role === 'subadmin' && (
                          <Link
                            href="/content-admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-gold font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FiUser size={16} /> Content Admin Panel
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FiUser size={16} /> My Profile
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FiShoppingBag size={16} /> My Orders
                        </Link>
                        <Link
                          href="/wallet"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FiCreditCard size={16} /> Wallet
                        </Link>
                        <hr className="my-1 border-gray-100 dark:border-gray-700" />
                        <button
                          onClick={() => { logout(); setProfileOpen(false); router.push('/'); }}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                        >
                          <FiLogOut size={16} /> Logout
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/auth/login"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-green dark:text-[#F8F0E8] font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <FiUser size={16} /> Login / Register
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                    <button
                      onClick={() => { toggleTheme(); setProfileOpen(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                    >
                      {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
                      {isDark ? 'Light Mode' : 'Night Mode'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div ref={searchBarRef} className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 animate-slide-down">
            <div className="w-full px-4 sm:px-6 lg:px-[50px] py-4">
              <form onSubmit={handleSearch} className="flex items-center gap-3">
                <FiSearch className="text-gray-400" size={20} />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for sarees, kurtis, dresses..."
                  className="flex-1 outline-none text-brand-charcoal dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-gray-600 mr-1"
                    aria-label="Clear search"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </form>

              {/* Search History */}
              {searchHistory.length > 0 && !searchQuery && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Recent Searches</p>
                    <button
                      onClick={clearSearchHistory}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...searchHistory].reverse().map((term) => (
                      <div
                        key={term}
                        className="group flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full pl-3 pr-1.5 py-1.5 hover:border-brand-gold/50 transition-colors"
                      >
                        <button
                          onClick={() => { setSearchQuery(term); }}
                          className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-charcoal dark:hover:text-white"
                        >
                          {term}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromSearchHistory(term); }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500 transition-colors"
                          aria-label={`Remove ${term}`}
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 animate-slide-down">
            <nav className="py-4 px-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2" />
              {isAuthenticated ? (
                <>
                  <Link href="/profile" className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">My Account</Link>
                  <Link href="/orders" className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">My Orders</Link>
                  <Link href="/wishlist" className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">Wishlist</Link>
                </>
              ) : (
                <Link href="/auth/login" className="block py-3 px-4 text-brand-green dark:text-[#F8F0E8] font-semibold hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">
                  Login / Register
                </Link>
              )}
              <button
                onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                {isDark ? 'Light Mode' : 'Night Mode'}
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
