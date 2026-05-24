'use client';

import { useState, useEffect, useRef, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiHeart } from 'react-icons/fi';
import { useAuthStore, useAuthModalStore, useCartStore, useWishlistStore } from '@/lib/store';
import toast from 'react-hot-toast';

// Module-level cache for the device's hover capability. `matchMedia` is
// cheap individually, but on a long product grid it would otherwise be
// called on every single mouse event of every card. Resolved once and
// shared across every card instance.
let _hasHover = null;
const deviceHasHover = () => {
  if (_hasHover !== null) return _hasHover;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  _hasHover = window.matchMedia('(hover: hover)').matches;
  return _hasHover;
};

function ProductCard({ product }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuthModal = useAuthModalStore((s) => s.open);
  const addToCart = useCartStore((s) => s.addItem);
  const { isInWishlist, addItem, removeItem } = useWishlistStore();
  const inWishlist = isAuthenticated && isInWishlist(product._id);
  const [currentImage, setCurrentImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const intervalRef = useRef(null);
  const cardRef = useRef(null);
  const hasMultipleImages = product.images?.length > 1;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    try {
      if (inWishlist) {
        await removeItem(product._id);
        toast.success('Removed from wishlist');
      } else {
        await addItem(product._id);
        toast.success('Added to wishlist');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const totalStock = product.sizes?.reduce((sum, s) => sum + s.stock, 0) || 0;
  const isOutOfStock = totalStock === 0;
  // ---- Social-proof signals (all derived from real data) ---------------
  // Low-stock threshold falls back to 5 when the admin hasn't customised
  // it on the product. We only show scarcity copy when at least one unit
  // is still available — otherwise the "Out of Stock" badge takes over.
  const lowStockThreshold = product.lowStockThreshold ?? 5;
  const isLowStock = !isOutOfStock && totalStock <= lowStockThreshold;
  // "Selling fast" comes from the rolling weekly sales bucket (set in
  // backend at order placement). Only surface it once at least 5 real
  // units have shipped this week — keeps the copy honest.
  const weeklySold = product.weeklySales?.count || 0;
  const isSellingFast = !isOutOfStock && weeklySold >= 5;
  // "Popular" reflects lifetime real sales. Threshold is intentionally
  // conservative so the badge stays meaningful on a small catalogue.
  const isPopular = !isOutOfStock && (product.salesCount || 0) >= 20;
  // First in-stock size — used to add to bag directly when the product
  // only has a single size. If multiple sizes exist we send the user to
  // the product page so they can choose.
  const firstInStockSize = product.sizes?.find((s) => s.stock > 0)?.size;
  const sizeOptions = product.sizes?.filter((s) => s.stock > 0) || [];
  const needsSizeChoice = sizeOptions.length > 1;

  const startSlide = () => {
    if (!hasMultipleImages) return;
    if (intervalRef.current) return; // already running
    intervalRef.current = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % product.images.length);
    }, 2000);
  };

  const stopSlide = (resetIndex = true) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (resetIndex) setCurrentImage(0);
  };

  // Mouse-driven auto-slide for desktop hover. We only start the
  // slideshow on `mouseenter`; `mouseleave` is the one that needs to
  // discriminate between a real desktop pointer leaving the card
  // (resets to the first image) and a touch device firing a synthetic
  // mouseleave at the end of a tap (must not interrupt the IO-driven
  // autoplay below).
  const handleMouseEnter = () => {
    startSlide();
  };

  const handleMouseLeave = () => {
    if (deviceHasHover()) stopSlide(true);
  };

  // Drive the slideshow by viewport visibility on every device. We used
  // to gate this behind `(hover: none)` but several mobile browsers
  // (and dev-tool emulations) report `hover: hover`, which left mobile
  // users stuck on the first image. Running IO unconditionally is safe:
  // the interval is cleared as soon as the card scrolls out, so off-
  // screen cards don't burn CPU.
  useEffect(() => {
    if (!hasMultipleImages || typeof window === 'undefined') return undefined;
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      startSlide();
      return () => stopSlide(false);
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startSlide();
          else stopSlide(false);
        });
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => {
      io.disconnect();
      stopSlide(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultipleImages, product.images?.length]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleAddToBag = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isOutOfStock) return;
    // Read auth state via getState() so the resumed call after a successful
    // login (fired from the modal's `pendingAction`) sees the now-true
    // value instead of the stale `false` captured by the original click's
    // closure — otherwise we'd reopen the modal in an infinite loop.
    const authed = useAuthStore.getState().isAuthenticated;
    if (!authed) {
      // Open the popup over the same page; once login completes the
      // resolver fires this `pendingAction`, which retries the add — so
      // the user lands back on the same product list with the item added
      // and never loses their place.
      openAuthModal('login', () => handleAddToBag(null));
      return;
    }
    if (needsSizeChoice) {
      // Multiple sizes available — the user must choose. We can't pick
      // for them silently, so route them to the product detail page
      // where the size grid lives. Single-size products skip this entirely.
      toast('Choose a size to continue', { icon: '👕' });
      window.location.href = `/product/${product.slug}`;
      return;
    }
    if (!firstInStockSize) return;
    setAdding(true);
    try {
      await addToCart(product._id, firstInStockSize);
      toast.success('Added to bag!');
    } catch (err) {
      toast.error(err.message || 'Could not add to bag');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={`/product/${product.slug}`} className="group block" ref={cardRef}>
      <div className={`card overflow-hidden ${isOutOfStock ? 'opacity-60' : ''}`}>
        {/* Image */}
        <div
          className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-700 product-image-zoom"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Image
            src={product.images?.[currentImage]?.url || product.images?.[0]?.url || '/placeholder.jpg'}
            alt={product.images?.[currentImage]?.alt || product.name}
            fill
            className={`object-cover transition-opacity duration-500 ${isOutOfStock ? 'grayscale' : ''}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
          />

          {/* Image dots indicator — sits above the action row so the
              heart and Add-to-Bag pill don't overlap it. */}
          {hasMultipleImages && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {product.images.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    currentImage === i ? 'bg-white w-3' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {isOutOfStock && (
              <span className="bg-gray-800 text-white text-xs font-semibold px-2 py-1 rounded-full">
                Out of Stock
              </span>
            )}
            {discount > 0 && (
              <span className="bg-green-100 text-green-700 text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                Save {discount}%
              </span>
            )}
            {/* Social proof — show the single strongest signal so badges
                never stack into a wall of stickers. Priority:
                Only X left  >  Selling fast  >  Popular  >  Trending */}
            {isLowStock ? (
              <span className="bg-orange-100 text-orange-700 text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                Only {totalStock} left
              </span>
            ) : isSellingFast ? (
              <span className="bg-rose-100 text-rose-700 text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                Selling fast
              </span>
            ) : isPopular ? (
              <span className="bg-amber-100 text-amber-800 text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                Popular
              </span>
            ) : product.isTrending && (
              <span className="bg-brand-green text-white text-xs font-semibold px-2 py-1 rounded-full">
                Trending
              </span>
            )}
          </div>

          {/* Bottom action row — wishlist heart on the left, compact
              Add-to-Bag pill on the right. Both stay visible at all
              times (no hover gating) so mobile shoppers can reach them
              just as easily as desktop users. */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 z-10 pointer-events-none">
            <button
              onClick={handleWishlist}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`pointer-events-auto w-7 h-7 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md flex items-center justify-center transition-colors ${
                inWishlist ? 'text-red-500' : 'text-gray-700 dark:text-white hover:text-red-500 dark:hover:text-red-400'
              }`}
            >
              <FiHeart size={13} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              onClick={handleAddToBag}
              disabled={isOutOfStock || adding}
              aria-label={isOutOfStock ? 'Out of stock' : 'Add to bag'}
              className={`pointer-events-auto inline-flex items-center px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-semibold tracking-wider uppercase backdrop-blur-sm shadow-sm transition-colors ${
                isOutOfStock
                  ? 'bg-gray-200/80 text-gray-500 dark:bg-gray-700/80 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-white/80 text-gray-800 hover:bg-white hover:text-brand-green dark:bg-gray-800/90 dark:text-white dark:hover:bg-gray-800 dark:hover:text-[#F8F0E8]'
              }`}
            >
              {isOutOfStock ? 'Sold out' : adding ? 'Adding…' : 'Add to bag'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{product.category}</p>
          <h3 className="font-serif text-sm md:text-base font-medium text-brand-charcoal dark:text-gray-100 line-clamp-2 group-hover:text-brand-green dark:group-hover:text-[#F8F0E8] transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-semibold text-brand-charcoal dark:text-gray-100">₹{product.price.toLocaleString()}</span>
            {product.comparePrice && (
              <span className="text-sm text-gray-400 line-through">₹{product.comparePrice.toLocaleString()}</span>
            )}
          </div>
          {product.averageRating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-xs ${i < Math.round(product.averageRating) ? 'text-brand-gold' : 'text-gray-300'}`}>★</span>
                ))}
              </div>
              <span className="text-xs text-gray-400">({product.numReviews})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Wrap in `memo` so a card only re-renders when its own product prop
// actually changes. Product grids are big — without this every parent
// state change (sort, filter, pagination, even a sibling's wishlist
// toggle that triggers a store update) would re-render every card.
// The `product` object reference is stable across renders coming from
// the API, so reference equality is enough.
export default memo(ProductCard);
