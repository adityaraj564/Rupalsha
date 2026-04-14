'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiSearch, FiHeart, FiShoppingBag, FiUser, FiMenu, FiX } from 'react-icons/fi';
import { useAuthStore, useCartStore, useWishlistStore } from '@/lib/store';
import { couponsAPI } from '@/lib/api';

const NAV_LINKS = [
  { href: '/products', label: 'Shop All' },
  { href: '/products?category=sarees', label: 'Sarees' },
  { href: '/products?category=kurtis', label: 'Kurtis' },
  { href: '/products?category=lehengas', label: 'Lehengas' },
  { href: '/products?category=dresses', label: 'Dresses' },
  { href: '/products?category=accessories', label: 'Accessories' },
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
  const pathname = usePathname();
  const router = useRouter();

  const { isAuthenticated, user } = useAuthStore();
  const cartCount = useCartStore((s) => s.getCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    couponsAPI.getActive().then((data) => {
      if (data?.length) setCoupons(data);
    }).catch(() => {});
  }, []);

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
      } else if (trimmed.length === 0) {
        // When search is fully cleared, show all products
        router.push('/products');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, router]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Live search handles it — form submit just prevents page reload
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const isAdmin = pathname.startsWith('/admin');
  if (isAdmin) return null;

  const formatCoupon = (c) => {
    const off = c.discountType === 'percentage' ? `${c.discountValue}% off` : `₹${c.discountValue} off`;
    const min = c.minOrderAmount > 0 ? ` on orders above ₹${c.minOrderAmount}` : '';
    return { text: c.description || `${off}${min}`, code: c.code };
  };

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-brand-green text-white text-center py-2 text-xs md:text-sm font-sans tracking-wide overflow-hidden h-8 flex items-center justify-center">
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

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-brand-cream'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 -ml-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-green tracking-wide">
                RUPALSHA
              </h1>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-brand-charcoal hover:text-brand-green transition-colors relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3 md:space-x-4">
              <button
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
                    <span className="absolute -top-0.5 -right-0.5 bg-brand-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              <Link
                href="/cart"
                className="p-2 hover:text-brand-green transition-colors relative"
              >
                <FiShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              <Link
                href={isAuthenticated ? '/profile' : '/auth/login'}
                className="p-2 hover:text-brand-green transition-colors"
              >
                <FiUser size={20} />
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="border-t border-gray-100 bg-white animate-slide-down">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <form onSubmit={handleSearch} className="flex items-center gap-3">
                <FiSearch className="text-gray-400" size={20} />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for sarees, kurtis, dresses..."
                  className="flex-1 outline-none text-brand-charcoal placeholder-gray-400 bg-transparent"
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
                <button
                  type="button"
                  onClick={handleCloseSearch}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Close
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white animate-slide-down">
            <nav className="py-4 px-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-3 px-4 text-brand-charcoal hover:bg-brand-cream rounded-lg transition-colors font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2" />
              {isAuthenticated ? (
                <>
                  <Link href="/profile" className="block py-3 px-4 text-brand-charcoal hover:bg-brand-cream rounded-lg">My Account</Link>
                  <Link href="/orders" className="block py-3 px-4 text-brand-charcoal hover:bg-brand-cream rounded-lg">My Orders</Link>
                  <Link href="/wishlist" className="block py-3 px-4 text-brand-charcoal hover:bg-brand-cream rounded-lg">Wishlist</Link>
                </>
              ) : (
                <Link href="/auth/login" className="block py-3 px-4 text-brand-green font-semibold hover:bg-brand-cream rounded-lg">
                  Login / Register
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
