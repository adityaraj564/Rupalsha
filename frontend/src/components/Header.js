'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

// Read a single URL search param without using next/navigation's
// useSearchParams — that hook forces every parent route to render
// dynamically (no static prerender / ISR), which we must avoid in the
// root layout. Both call sites below run inside useEffect, so reading
// from window.location at runtime is equivalent.
function readSearchParam(key) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) || '';
}
import { FiSearch, FiHeart, FiShoppingBag, FiUser, FiMenu, FiX, FiSun, FiMoon, FiLogOut, FiCreditCard, FiGift } from 'react-icons/fi';
import { useAuthStore, useAuthModalStore, useCartStore, useWishlistStore, useThemeStore } from '@/lib/store';
import NotificationBell from './NotificationBell';
import { couponsAPI, categoriesAPI } from '@/lib/api';
import { useFreeShippingThreshold } from '@/lib/useSiteSettings';
import { gaSearch } from '@/lib/analytics';
import toast from 'react-hot-toast';

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
  const [categoryNames, setCategoryNames] = useState([]);
  const [animPlaceholder, setAnimPlaceholder] = useState('');

  const { isAuthenticated, user, logout } = useAuthStore();
  const openAuthModal = useAuthModalStore((s) => s.open);
  const cartCount = useCartStore((s) => s.getCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const freeShippingThreshold = useFreeShippingThreshold();

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
        // Just close — keep the query in state so reopening shows the
        // user's most recent search and the matching results page they
        // were already looking at.
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  // Close search on scroll (only when scrolling down/away from top)
  useEffect(() => {
    if (!searchOpen) return;
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      if (y > lastY && y > 10) {
        setSearchOpen(false);
      }
      lastY = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchOpen]);

  // Mobile pull-down at top opens search bar (Palmonas-style)
  useEffect(() => {
    let startY = null;
    const onTouchStart = (e) => {
      startY = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e) => {
      if (startY === null || searchOpen || mobileMenuOpen) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 60) {
        setSearchOpen(true);
        startY = null;
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [searchOpen, mobileMenuOpen]);

  // Load categories for placeholder suggestions
  useEffect(() => {
    let cancelled = false;
    categoriesAPI.getTree().then((data) => {
      if (cancelled) return;
      const tree = Array.isArray(data) ? data : (Array.isArray(data?.categories) ? data.categories : []);
      const names = [];
      const walk = (arr) => arr.forEach((c) => {
        if (c?.name) names.push(c.name);
        if (Array.isArray(c.children)) walk(c.children);
      });
      walk(tree);
      if (names.length) setCategoryNames(names);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Typewriter placeholder cycling through category names
  useEffect(() => {
    if (!searchOpen || searchQuery || categoryNames.length === 0) {
      setAnimPlaceholder('');
      return;
    }
    let idx = 0, char = 0, deleting = false, timer;
    const tick = () => {
      const word = categoryNames[idx];
      if (!deleting) {
        char++;
        setAnimPlaceholder(`Search for ${word.slice(0, char)}|`);
        if (char >= word.length) {
          deleting = true;
          timer = setTimeout(tick, 5000);
          return;
        }
      } else {
        char--;
        setAnimPlaceholder(`Search for ${word.slice(0, char)}|`);
        if (char <= 0) {
          deleting = false;
          idx = (idx + 1) % categoryNames.length;
        }
      }
      timer = setTimeout(tick, deleting ? 40 : 90);
    };
    tick();
    return () => clearTimeout(timer);
  }, [searchOpen, searchQuery, categoryNames]);

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

  // Navigation happens only on form submit (Enter) — see handleSearch below.

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

  // When the search bar is opened on the products page that already has a
  // `?search=…` param (e.g. user landed via a deep link or refined a
  // search earlier), prefill the input so they can see and edit the
  // active query instead of staring at an empty box.
  useEffect(() => {
    if (!searchOpen) return;
    if (pathname !== '/products') return;
    const urlQ = readSearchParam('search');
    if (urlQ && !searchQuery) setSearchQuery(urlQ);
    // We deliberately don't sync in the other direction — typing should
    // overwrite, never the URL clobbering the user's in-progress text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) return;
    addToSearchHistory(trimmed);
    gaSearch(trimmed);
    // Pressing Enter just makes sure we're on the products page with the
    // current query — the live debounced effect below already keeps the
    // URL in sync as the user types. We deliberately do NOT close the
    // search bar here: when a query returns no results the user should
    // still see their typed text and the empty state, and be able to
    // refine without reopening the bar.
    router.push(`/products?search=${encodeURIComponent(trimmed)}`);
  };

  // Live, debounced search.
  // ------------------------------------------------------------------
  // As the user types we wait 300ms after the last keystroke and then
  // sync the products page to the current query. Rules:
  //   - 0 chars  → if we're already on /products, drop the search param
  //                so the default listing comes back. Otherwise no-op
  //                (don't yank the user away from where they were).
  //   - 1 char   → ignore (avoids hammering the API on a single letter).
  //   - ≥2 chars → push/replace `/products?search=…` so the listing
  //                renders matching products in real time.
  // We use `router.replace` while the user is actively typing so the
  // back button doesn't fill up with one history entry per keystroke;
  // the explicit Enter handler above uses `push` so a deliberate
  // submit becomes a real history entry the user can navigate back to.
  // ------------------------------------------------------------------
  // Perf: we deliberately do NOT include `pathname` in the dep array.
  // Putting it there would re-run this effect (and restart the timer)
  // every time the URL changes — including in response to our own
  // `router.replace` calls — wasting one render and one timer per
  // keystroke. Reading it through a ref lets the effect run only when
  // the user actually types. The current search param is read directly
  // from window.location.search at fire time so it's always fresh.
  const navStateRef = useRef({ pathname });
  useEffect(() => {
    navStateRef.current = { pathname };
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const trimmed = searchQuery.trim();
    const t = setTimeout(() => {
      const { pathname: pn } = navStateRef.current;
      const onProducts = pn === '/products';
      if (trimmed.length === 0) {
        if (onProducts && readSearchParam('search')) {
          router.replace('/products');
        }
        return;
      }
      if (trimmed.length < 2) return;
      const current = readSearchParam('search');
      if (current === trimmed && onProducts) return;
      router.replace(`/products?search=${encodeURIComponent(trimmed)}`);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchOpen, router]);

  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/content-admin');
  const isContentAdminBrowsing = user?.role === 'subadmin' && isAuthenticated && !isAdmin;

  if (isAdmin) return null;

  // Minimal header for content admin browsing help/about/blog pages
  if (isContentAdminBrowsing) {
    return (
      <header className="sticky top-0 z-50 bg-brand-cream dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="w-full px-4 sm:px-6 lg:px-20 xl:px-32">
          <div className="flex items-center justify-between h-20">
            <Link href="/content-admin" className="flex-shrink-0 flex items-center">
              <h1 className="font-sans text-lg sm:text-xl md:text-2xl font-semibold tracking-[0.25em] sm:tracking-[0.3em] md:tracking-[0.35em] uppercase text-brand-charcoal dark:text-[#F8F0E8]">RUPALSHA</h1>
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
                    <button onClick={() => { logout(); toast.success('Logged out'); setProfileOpen(false); router.push('/'); }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors w-full text-left">
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
          <span>Free Shipping on orders above ₹{freeShippingThreshold.toLocaleString()}</span>
        )}
      </div>
      )}

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm' : 'bg-brand-cream dark:bg-gray-950'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-20 xl:px-32">
          <div className="flex items-center justify-between h-20">
            {/* Left: Mobile menu + Logo */}
            <div className="flex items-center gap-6 md:gap-0">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1 -ml-3"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center -ml-2 md:ml-0">
              <h1 className="font-sans text-lg sm:text-2xl md:text-3xl font-normal tracking-[0.18em] sm:tracking-[0.3em] md:tracking-[0.35em] uppercase text-brand-charcoal dark:text-[#F8F0E8]">
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
            <div className="flex items-center gap-1 md:gap-3">
              {!searchOpen && (
                <button
                  ref={searchBtnRef}
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-1.5 md:p-2 ml-2 md:ml-0 hover:text-brand-green transition-colors"
                  aria-label="Search"
                >
                  <FiSearch size={20} />
                </button>
              )}

              {isAuthenticated && (
                <Link
                  href="/wishlist"
                  className="p-1.5 md:p-2 hover:text-brand-green transition-colors relative hidden sm:block"
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
                className="p-1.5 md:p-2 hover:text-brand-green transition-colors relative"
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
                  className="p-1.5 md:p-2 hover:text-brand-green transition-colors"
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
                        <Link
                          href="/rewards"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FiGift size={16} /> Rewards
                        </Link>
                        <hr className="my-1 border-gray-100 dark:border-gray-700" />
                        <button
                          onClick={() => { logout(); toast.success('Logged out'); setProfileOpen(false); router.push('/'); }}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                        >
                          <FiLogOut size={16} /> Logout
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setProfileOpen(false); openAuthModal('login'); }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-green dark:text-[#F8F0E8] font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                      >
                        <FiUser size={16} /> Login / Register
                      </button>
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

        {/* Search Bar — modern, premium look. The input itself is a tall
            pill with a subtle inner background, soft shadow, and a focus
            ring in the brand colour. The leading icon sits inside a
            circular badge and the trailing area shows either a clear (×)
            button or a subtle "Press Enter ↵" hint so customers know how
            to submit. */}
        {searchOpen && (
          <div
            ref={searchBarRef}
            className="border-t border-gray-100 dark:border-gray-800 bg-gradient-to-b from-white to-brand-cream/40 dark:from-gray-900 dark:to-gray-950 animate-slide-down"
          >
            <div className="w-full px-4 sm:px-6 lg:px-20 xl:px-32 py-5 md:py-7">
              <form
                onSubmit={handleSearch}
                className="group relative flex items-center gap-3 bg-white dark:bg-gray-900 rounded-full pl-2 pr-2 py-2 shadow-[0_4px_24px_-8px_rgba(14,42,34,0.18)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.6)] ring-1 ring-gray-200/70 dark:ring-gray-700/60 focus-within:ring-2 focus-within:ring-brand-green/50 focus-within:shadow-[0_8px_32px_-10px_rgba(14,42,34,0.28)] transition-all"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-green/10 text-brand-green dark:bg-brand-gold/10 dark:text-brand-gold shrink-0">
                  <FiSearch size={18} />
                </span>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={animPlaceholder || 'Search for sarees, kurtis, dresses…'}
                  className={`flex-1 outline-none text-base md:text-lg text-brand-charcoal dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent ${!searchQuery ? 'caret-transparent' : ''}`}
                  autoFocus
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Clear search"
                  >
                    <FiX size={16} />
                  </button>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 select-none">
                    Press
                    <kbd className="px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-sans text-[10px] text-gray-500">Enter</kbd>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="hidden md:inline-flex items-center gap-2 rounded-full bg-brand-green text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-green/90 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Search History */}
              {searchHistory.length > 0 && !searchQuery && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.18em]">Recent Searches</p>
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
                        className="group flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full pl-3 pr-1.5 py-1.5 hover:border-brand-gold/60 hover:shadow-sm transition-all"
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
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2" />
              {isAuthenticated ? (
                <>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">My Account</Link>
                  <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">My Orders</Link>
                  <Link href="/wallet" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">Wallet</Link>
                  <Link href="/rewards" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">Rewards</Link>
                  <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-brand-charcoal dark:text-gray-200 hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg">Wishlist</Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); openAuthModal('login'); }}
                  className="block w-full text-left py-3 px-4 text-brand-green dark:text-[#F8F0E8] font-semibold hover:bg-brand-cream dark:hover:bg-gray-800 rounded-lg"
                >
                  Login / Register
                </button>
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
