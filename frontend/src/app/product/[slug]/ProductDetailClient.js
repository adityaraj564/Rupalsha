'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiHeart, FiShoppingBag, FiTruck, FiRefreshCw, FiChevronLeft, FiChevronRight, FiStar, FiMapPin, FiCheck, FiX, FiShare2, FiCamera, FiBell, FiVideo, FiChevronDown, FiPlay, FiPause } from 'react-icons/fi';
import { productsAPI, reviewsAPI } from '@/lib/api';
import { gaViewItem, gaAddToCart } from '@/lib/analytics';
import { lookupPincode } from '@/lib/pincodeLookup';
import { useAuthStore, useAuthModalStore, useCartStore, useWishlistStore } from '@/lib/store';
import { useFreeShippingThreshold } from '@/lib/useSiteSettings';
import SizeGuideModal from '@/components/SizeGuideModal';
import ProductCard from '@/components/ProductCard';
import { ProductDetailSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';

export default function ProductDetailPage({ initialProduct = null } = {}) {
  const { slug } = useParams();
  const router = useRouter();
  const freeShippingThreshold = useFreeShippingThreshold();
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [initialLoad, setInitialLoad] = useState(!initialProduct);
  const [selectedSize, setSelectedSize] = useState(
    initialProduct && initialProduct.sizes && initialProduct.sizes.length === 1
      ? initialProduct.sizes[0].size
      : ''
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoOverlay, setShowVideoOverlay] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const overlayHideTimer = useRef(null);
  const videoRef = useRef(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [reviewImages, setReviewImages] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' });
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [pinchScale, setPinchScale] = useState(1);
  const [pinchOrigin, setPinchOrigin] = useState('center center');
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState('specifications');
  const pinchStartDist = useRef(null);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.open);
  const addToCart = useCartStore((s) => s.addItem);
  const { isInWishlist, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlistStore();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Strategy:
        //  - First paint: SWR returns cached data instantly + revalidates
        //    in the background via `onFresh`.
        //  - If the (cached) total stock is dangerously low (<= 3), we kick
        //    off an immediate `fresh: true` fetch in parallel that bypasses
        //    cache. Whichever finishes second wins via `onFresh`. This
        //    guarantees scarcity is never displayed based on stale data.
        const swrPromise = productsAPI.getBySlug(slug, {
          onFresh: (data) => {
            if (data?.product) setProduct(data.product);
          },
        });
        const { product: p } = await swrPromise;
        setProduct(p);
        if (p.sizes.length === 1) setSelectedSize(p.sizes[0].size);

        const totalStock = (p.sizes || []).reduce((s, x) => s + (x.stock || 0), 0);
        if (totalStock <= 3) {
          productsAPI.getBySlug(slug, { fresh: true })
            .then((data) => { if (data?.product) setProduct(data.product); })
            .catch(() => {});
        }

        // Fetch reviews and similar products in parallel
        const [reviewData] = await Promise.all([
          reviewsAPI.getByProduct(p._id, { limit: 2, page: 1 }),
          productsAPI.getSimilar(slug, 20, {
            onFresh: (data) => { if (data?.products) setSuggestedProducts(data.products); },
          }).then(({ products: similar }) => {
            setSuggestedProducts(similar);
          }).catch(() => {}),
        ]);
        setReviews(reviewData.reviews);
        setTotalReviews(reviewData.total);
      } catch (err) {
        toast.error('Product not found');
        router.push('/products');
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };
    fetchProduct();
  }, [slug, router]);

  // Default the All Details tab based on what's available
  useEffect(() => {
    if (!product) return;
    const hasSpecs = product.specifications && product.specifications.length > 0;
    if (!hasSpecs && product.description) setDetailsTab('description');
    else if (hasSpecs) setDetailsTab('specifications');
  }, [product]);

  // Bump the real view counter once per session per product. Gated by
  // sessionStorage so a visitor refreshing the page does not inflate the
  // "viewed today" number we display further down. Silent on failure.
  useEffect(() => {
    if (!product?._id || typeof window === 'undefined') return;
    try {
      const key = `viewTracked:${product._id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      productsAPI.trackView(product._id);
      gaViewItem(product);
    } catch {
      // sessionStorage unavailable (private mode etc) — skip silently.
    }
  }, [product?._id]);

  const handleAddToCart = async () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    // Read auth via getState() so a resumed call (after the modal logs the
    // user in) sees the fresh value rather than the stale `false` captured
    // when the user first clicked.
    if (!useAuthStore.getState().isAuthenticated) {
      openAuthModal('login', () => handleAddToCart());
      return;
    }
    setAddingToCart(true);
    try {
      await addToCart(product._id, selectedSize);
      gaAddToCart(product, { size: selectedSize, quantity: 1 });
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (!useAuthStore.getState().isAuthenticated) {
      openAuthModal('login', () => handleBuyNow());
      return;
    }
    try {
      await addToCart(product._id, selectedSize);
      gaAddToCart(product, { size: selectedSize, quantity: 1 });
      router.push('/checkout');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleWishlist = async () => {
    if (!useAuthStore.getState().isAuthenticated) {
      openAuthModal('login', () => handleWishlist());
      return;
    }
    try {
      if (isInWishlist(product._id)) {
        await removeFromWishlist(product._id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(product._id);
        toast.success('Added to wishlist');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePincodeCheck = async () => {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setPincodeResult({ deliverable: false, message: 'Please enter a valid 6-digit pincode' });
      return;
    }
    setCheckingPincode(true);
    setPincodeResult(null);
    try {
      const result = await lookupPincode(pincode);
      if (result && result.success) {
        setPincodeResult({
          deliverable: true,
          message: `Delivery available to ${result.area}, ${result.city}, ${result.state}. Estimated delivery in 5-7 business days.`,
        });
      } else {
        setPincodeResult({
          deliverable: false,
          message: 'Invalid pincode. Please check and try again.',
        });
      }
    } catch {
      setPincodeResult({
        deliverable: false,
        message: 'Unable to verify pincode. Please try again.',
      });
    } finally {
      setCheckingPincode(false);
    }
  };

  const handleLoadMoreReviews = async () => {
    setLoadingMoreReviews(true);
    try {
      const nextPage = reviewPage + 1;
      const { reviews: moreReviews } = await reviewsAPI.getByProduct(product._id, { limit: 2, page: nextPage });
      setReviews((prev) => [...prev, ...moreReviews]);
      setReviewPage(nextPage);
    } catch (err) {
      toast.error('Failed to load more reviews');
    } finally {
      setLoadingMoreReviews(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!reviewForm.comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewsAPI.create({
        productId: product._id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
        images: reviewImages,
      });
      toast.success('Review submitted! It will appear after approval.');
      setReviewForm({ rating: 5, title: '', comment: '' });
      setReviewImages([]);
      setShowReviewForm(false);

      // Refresh reviews and product rating
      const [{ reviews: freshReviews, total }, { product: freshProduct }] = await Promise.all([
        reviewsAPI.getByProduct(product._id, { limit: 2, page: 1 }),
        productsAPI.getBySlug(slug),
      ]);
      setReviews(freshReviews);
      setTotalReviews(total);
      setReviewPage(1);
      setProduct(freshProduct);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (initialLoad && loading) return <ProductDetailSkeleton />;
  if (!product) return null;

  const inWishlist = isAuthenticated && isInWishlist(product._id);
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  // Google/Merchant/SEO structured data for this product.
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rupalsha.com').replace(/\/$/, '');
  const productHasStock = (product.sizes || []).some((s) => s.stock > 0);
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: String(product.description || '').replace(/<[^>]+>/g, ' ').slice(0, 4900),
    image: (product.images || []).map((i) => i.url).filter(Boolean),
    sku: product.productCode || product._id,
    brand: { '@type': 'Brand', name: 'Rupalsha' },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: Number(product.price).toFixed(2),
      ...(product.comparePrice && product.comparePrice > product.price
        ? { priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
        : {}),
      availability: productHasStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(product.numReviews > 0 && product.averageRating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.averageRating).toFixed(1),
            reviewCount: product.numReviews,
          },
        }
      : {}),
  };

  const getStockForSize = (sizeName) => {
    const s = product.sizes.find((sz) => sz.size === sizeName);
    return s ? s.stock : 0;
  };

  const totalStock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
  const isOutOfStock = totalStock === 0;

  return (
    <div
      className="no-copy w-full px-4 sm:px-6 lg:px-20 xl:px-32 py-8 md:py-12 animate-fade-in"
      style={{ overflowClipMargin: 'content-box', overflowX: 'clip' }}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Product structured data for Google Search & Merchant Center */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-8 overflow-hidden">
        <Link href="/" className="hover:text-brand-green">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-green">Shop</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category}`} className="hover:text-brand-green capitalize">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-brand-charcoal dark:text-gray-200 truncate">{product.name}</span>
      </nav>

      <div className="md:flex md:gap-12 md:items-start">
        {/* Images */}
        <div className="md:sticky md:top-24 md:w-[44%] lg:w-[42%] md:flex-shrink-0 min-w-0 md:self-start">
          {(() => {
            const media = [
              ...(product.images || []).map((m) => ({ ...m, kind: 'image' })),
              ...(product.videos || []).map((m) => ({ ...m, kind: 'video' })),
            ];
            const current = media[selectedImage] || media[0];
            const isVideo = current?.kind === 'video';
            return (
          <>
          <div
            className={`relative aspect-[3/4] md:aspect-[9/10] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4 ${isVideo ? '' : 'md:cursor-crosshair'}`}
            onMouseMove={(e) => {
              if (isVideo) return;
              if (window.innerWidth < 768) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setZoomStyle({
                display: 'block',
                backgroundImage: `url(${current?.url})`,
                backgroundSize: '250%',
                backgroundPosition: `${x}% ${y}%`,
              });
            }}
            onMouseLeave={() => setZoomStyle({ display: 'none' })}
            onTouchStart={(e) => {
              if (isVideo) return;
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchStartDist.current = Math.hypot(dx, dy);
                const rect = e.currentTarget.getBoundingClientRect();
                const mx = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) / rect.width * 100;
                const my = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top) / rect.height * 100;
                setPinchOrigin(`${mx}% ${my}%`);
              }
            }}
            onTouchMove={(e) => {
              if (isVideo) return;
              if (e.touches.length === 2 && pinchStartDist.current) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const scale = Math.min(3, Math.max(1, dist / pinchStartDist.current));
                setPinchScale(scale);
              }
            }}
            onTouchEnd={() => {
              pinchStartDist.current = null;
              setPinchScale(1);
            }}
          >
            {isVideo ? (
              <>
                <video
                  key={current.url}
                  ref={videoRef}
                  src={current.url}
                  playsInline
                  preload="metadata"
                  poster={current.thumbnail || undefined}
                  onPlay={() => {
                    setIsVideoPlaying(true);
                    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
                    overlayHideTimer.current = setTimeout(() => setShowVideoOverlay(false), 600);
                  }}
                  onPause={() => {
                    setIsVideoPlaying(false);
                    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
                    setShowVideoOverlay(true);
                  }}
                  onEnded={() => {
                    setIsVideoPlaying(false);
                    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
                    setShowVideoOverlay(true);
                    setVideoProgress(0);
                  }}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (v.duration) setVideoProgress((v.currentTime / v.duration) * 100);
                  }}
                  onClick={() => {
                    if (!isVideoPlaying) return;
                    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
                    setShowVideoOverlay(true);
                    overlayHideTimer.current = setTimeout(() => setShowVideoOverlay(false), 2500);
                  }}
                  className="absolute inset-0 w-full h-full object-cover bg-black cursor-pointer"
                />
                {showVideoOverlay && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const v = videoRef.current;
                      if (!v) return;
                      if (v.paused) v.play(); else v.pause();
                    }}
                    aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
                  >
                    <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 group-hover:bg-white dark:bg-gray-900/90 dark:group-hover:bg-gray-900 shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
                      {isVideoPlaying ? (
                        <FiPause className="text-brand-charcoal dark:text-white" size={32} fill="currentColor" />
                      ) : (
                        <FiPlay className="text-brand-charcoal dark:text-white ml-1" size={32} fill="currentColor" />
                      )}
                    </span>
                  </button>
                )}
                {/* Progress bar */}
                <div
                  className="absolute left-0 right-0 bottom-0 h-1 bg-white/25 z-30 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const v = videoRef.current;
                    if (!v || !v.duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    v.currentTime = Math.max(0, Math.min(v.duration, ratio * v.duration));
                  }}
                >
                  <div
                    className="h-full bg-brand-gold transition-[width] duration-100"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <Image
                src={current?.url || '/placeholder.jpg'}
                alt={product.name}
                fill
                className="object-contain pointer-events-none transition-transform duration-150"
                style={{ transform: `scale(${pinchScale})`, transformOrigin: pinchOrigin }}
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            )}
            <div
              className="absolute inset-0 z-10 rounded-2xl hidden md:block pointer-events-none"
              style={isVideo ? { display: 'none' } : zoomStyle}
            />
            {media.length > 1 && (
              <>
                <button
                  onClick={() => { setSelectedImage((prev) => (prev === 0 ? media.length - 1 : prev - 1)); setIsVideoPlaying(false); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-700/80 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 transition-colors"
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  onClick={() => { setSelectedImage((prev) => (prev === media.length - 1 ? 0 : prev + 1)); setIsVideoPlaying(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-700/80 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 transition-colors"
                >
                  <FiChevronRight size={16} />
                </button>
              </>
            )}
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-brand-gold text-white text-sm font-semibold px-3 py-1 rounded-full">
                -{discount}%
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {media.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 max-w-full">
              {media.map((m, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedImage(i); setIsVideoPlaying(false); }}
                  className={`relative w-20 h-24 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    selectedImage === i ? 'border-brand-green' : 'border-transparent'
                  }`}
                >
                  {m.kind === 'video' ? (
                    <>
                      {m.thumbnail ? (
                        <img src={m.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={m.url} muted className="w-full h-full object-cover bg-black" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <FiVideo className="text-white drop-shadow" size={20} />
                      </span>
                    </>
                  ) : (
                    <Image src={m.url} alt="" fill className="object-cover" sizes="80px" />
                  )}
                </button>
              ))}
            </div>
          )}
          </>
            );
          })()}
        </div>

        {/* Details */}
        <div className="mt-8 md:mt-0 md:flex-1 min-w-0">
          <p className="text-brand-gold text-xs font-medium uppercase tracking-wider mb-2">{product.category}</p>
          <h1
            className="allow-copy font-serif text-2xl md:text-3xl font-bold text-brand-charcoal dark:text-gray-100 mb-4"
            onCopy={(e) => e.stopPropagation()}
            onCut={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >{product.name}</h1>

          {/* Rating */}
          {product.numReviews > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    size={16}
                    className={i < Math.round(product.averageRating) ? 'text-brand-gold fill-brand-gold' : 'text-gray-300'}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {product.averageRating} ({product.numReviews} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">₹{product.price.toLocaleString()}</span>
            {product.comparePrice && (
              <span className="text-lg text-gray-400 line-through">₹{product.comparePrice.toLocaleString()}</span>
            )}
          </div>
          {product.comparePrice && discount > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                Save {discount}%
              </span>
              {discount > 30 && (
                <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                  Hot Deal
                </span>
              )}
              <span className="text-xs font-medium text-green-700">
                You save ₹{(product.comparePrice - product.price).toLocaleString()}
              </span>
            </div>
          )}
          {!(product.comparePrice && discount > 0) && <div className="mb-6" />}

          {/* Social proof — genuine, data-backed copy. Each line is only
              shown when the underlying real counter clears a meaningful
              threshold so we never display "1 person viewed this today"
              style nonsense. View counter is incremented once per visitor
              session by the product detail page itself. */}
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const dailyViews = product.dailyViews?.date === today
              ? (product.dailyViews?.count || 0)
              : 0;
            const weeklySold = product.weeklySales?.count || 0;
            const lifetimeSold = product.salesCount || 0;
            // "Only X left" intentionally omitted — catalogue runs mostly
            // 1-of-1 inventory so the badge would appear on every product
            // and stop being meaningful. Out-of-stock state is already
            // surfaced by the disabled size buttons + Notify Me CTA.
            const showSellingFast = !isOutOfStock && weeklySold >= 5;
            const showPopular = !showSellingFast && lifetimeSold >= 20;
            const showViews = dailyViews >= 10;
            const hasAny = showSellingFast || showPopular || showViews;
            if (!hasAny) return null;
            return (
              <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
                {showSellingFast && (
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-semibold px-2.5 py-1 rounded-full border border-rose-200">
                    Selling fast
                  </span>
                )}
                {showPopular && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                    Popular this week
                  </span>
                )}
                {showViews && (
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    {dailyViews} people viewed this today
                  </span>
                )}
              </div>
            );
          })()}

          {/* Material */}
          {product.fabric && (
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-brand-charcoal">Material:</span> {product.fabric}
            </p>
          )}

          {/* Product Code */}
          {product.productCode && (
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-brand-charcoal">Product Code:</span>{' '}
              <span className="font-mono">{product.productCode}</span>
            </p>
          )}

          {/* Size Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">Select Size</span>
              {!(product.sizes.length === 1 && product.sizes[0].size === 'Free Size') && (
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-sm text-brand-green hover:underline"
                >
                  Size Guide
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {product.sizes.map((s) => (
                <button
                  key={s.size}
                  onClick={() => setSelectedSize(s.size)}
                  disabled={s.stock === 0}
                  className={`px-5 py-3 rounded-xl text-sm font-medium border transition-all ${
                    selectedSize === s.size
                      ? 'border-brand-green bg-brand-green text-white'
                      : s.stock === 0
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                      : 'border-gray-200 text-gray-700 hover:border-brand-green'
                  }`}
                >
                  {s.size}
                </button>
              ))}
            </div>
            {selectedSize && getStockForSize(selectedSize) <= 5 && getStockForSize(selectedSize) > 0 && (
              <p className="text-orange-500 text-sm mt-2">Only {getStockForSize(selectedSize)} left in stock!</p>
            )}
          </div>

          {/* Actions */}
          <div className="mb-8 space-y-3">
            <div className="flex gap-3">
              {isOutOfStock ? (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal('login');
                      return;
                    }
                    toast.success('We will notify you when this product is back in stock!');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors whitespace-nowrap"
                >
                  <FiBell size={18} />
                  Notify Me
                </button>
              ) : (
                <>
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 whitespace-nowrap text-sm md:text-base"
                  >
                    <FiShoppingBag size={18} />
                    {addingToCart ? 'Adding...' : 'Add to Cart'}
                  </button>
                  <button onClick={handleBuyNow} className="btn-gold flex-1 whitespace-nowrap text-sm md:text-base">
                    Buy Now
                  </button>
                </>
              )}
              {/* Icon buttons - visible only on md+ inline */}
              <button
                onClick={handleWishlist}
                className={`hidden md:flex w-12 h-12 flex-shrink-0 rounded-full border-2 items-center justify-center transition-colors ${
                  inWishlist ? 'border-red-400 text-red-500' : 'border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500'
                }`}
              >
                <FiHeart size={18} fill={inWishlist ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/product/${product.slug}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: product.name, text: `Check out ${product.name} on Rupalsha - ₹${product.price}`, url });
                    } catch {}
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard!');
                  }
                }}
                className="hidden md:flex w-12 h-12 flex-shrink-0 rounded-full border-2 border-gray-300 text-gray-400 items-center justify-center hover:border-brand-green hover:text-brand-green transition-colors"
              >
                <FiShare2 size={18} />
              </button>
            </div>
            {/* Mobile-only icon buttons row */}
            <div className="flex gap-3 md:hidden">
              <button
                onClick={handleWishlist}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                  inWishlist ? 'border-red-400 text-red-500' : 'border-gray-300 text-gray-500'
                }`}
              >
                <FiHeart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
                {inWishlist ? 'Wishlisted' : 'Wishlist'}
              </button>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/product/${product.slug}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: product.name, text: `Check out ${product.name} on Rupalsha - ₹${product.price}`, url });
                    } catch {}
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard!');
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-300 text-gray-500 text-sm font-medium hover:border-brand-green hover:text-brand-green transition-colors"
              >
                <FiShare2 size={16} />
                Share
              </button>
            </div>
          </div>

          {/* Policies */}
          <div className="space-y-3 py-6 border-t border-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <FiTruck className="text-brand-green flex-shrink-0" size={18} />
              <span>Free shipping on orders above ₹{freeShippingThreshold.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <FiRefreshCw className={`${product.isReturnable === false ? 'text-red-400' : 'text-brand-green'} flex-shrink-0`} size={18} />
              <span>{product.isReturnable === false ? 'This product is not eligible for returns' : `${product.returnDays || 7}-day return policy`}</span>
            </div>
            {product.isReturnable !== false && (
              <div className="flex items-start gap-3 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <FiVideo className="text-orange-500 flex-shrink-0 mt-0.5" size={18} />
                <span><strong>Tip:</strong> We strongly recommend recording an unboxing video while opening the package — it helps us resolve damaged or missing item claims quickly.</span>
              </div>
            )}
          </div>

          {/* Pincode Delivery Check */}
          <div className="py-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <FiMapPin className="text-brand-green" size={18} />
              <span className="font-medium text-sm">Check Delivery Availability</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={pincode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPincode(val);
                  setPincodeResult(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePincodeCheck()}
                placeholder="Enter pincode"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-green"
                maxLength={6}
              />
              <button
                onClick={handlePincodeCheck}
                disabled={checkingPincode || pincode.length !== 6}
                className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-800 transition-colors disabled:opacity-50"
              >
                {checkingPincode ? 'Checking...' : 'Check'}
              </button>
            </div>
            {pincodeResult && (
              <div className={`flex items-center gap-2 mt-3 text-sm ${pincodeResult.deliverable ? 'text-green-600' : 'text-red-500'}`}>
                {pincodeResult.deliverable ? <FiCheck size={16} /> : <FiX size={16} />}
                <span>{pincodeResult.message}</span>
              </div>
            )}
          </div>

          {/* Product Highlights - Flipkart style collapsible */}
          {product.highlights && product.highlights.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl mb-4 overflow-hidden">
              <button
                onClick={() => setHighlightsOpen(!highlightsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div>
                  <span className="font-semibold text-sm text-brand-charcoal dark:text-gray-100 block text-left">Product Highlights</span>
                  {!highlightsOpen && <span className="text-xs text-gray-400 dark:text-gray-500 block text-left">Key Feature, usage and more</span>}
                </div>
                <FiChevronDown className={`text-gray-500 transition-transform duration-200 ${highlightsOpen ? 'rotate-180' : ''}`} size={18} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${highlightsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                      {product.highlights.map((h, i) => (
                        <React.Fragment key={i}>
                          <span className="text-xs text-gray-500 dark:text-gray-400 py-1">{h.key}</span>
                          <span className="text-xs text-brand-charcoal dark:text-gray-200 font-medium py-1">{h.value}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Details / Specifications - Flipkart style collapsible */}
          {((product.specifications && product.specifications.length > 0) || product.description) && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl mb-4 overflow-hidden">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div>
                  <span className="font-semibold text-sm text-brand-charcoal dark:text-gray-100 block text-left">All Details</span>
                  {!detailsOpen && <span className="text-xs text-gray-400 dark:text-gray-500 block text-left">Features, description and more</span>}
                </div>
                <FiChevronDown className={`text-gray-500 transition-transform duration-200 ${detailsOpen ? 'rotate-180' : ''}`} size={18} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${detailsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                      {product.specifications && product.specifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setDetailsTab('specifications')}
                          className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                            detailsTab === 'specifications'
                              ? 'text-brand-charcoal dark:text-gray-100 border-b-2 border-brand-gold'
                              : 'text-gray-500 dark:text-gray-400 hover:text-brand-charcoal dark:hover:text-gray-200'
                          }`}
                        >
                          Specifications
                        </button>
                      )}
                      {product.description && (
                        <button
                          type="button"
                          onClick={() => setDetailsTab('description')}
                          className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                            detailsTab === 'description'
                              ? 'text-brand-charcoal dark:text-gray-100 border-b-2 border-brand-gold'
                              : 'text-gray-500 dark:text-gray-400 hover:text-brand-charcoal dark:hover:text-gray-200'
                          }`}
                        >
                          Description
                        </button>
                      )}
                    </div>

                    {/* Specifications panel */}
                    {detailsTab === 'specifications' && product.specifications && product.specifications.length > 0 && (
                      <div className="px-4 py-3">
                        {product.specifications.map((group, gi) => (
                          <div key={gi} className="mb-4 last:mb-0">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 pb-1 border-b border-gray-100 dark:border-gray-700">{group.group}</p>
                            <table className="w-full">
                              <tbody>
                                {group.fields.map((f, fi) => (
                                  <tr key={fi} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                                    <td className="text-xs text-gray-500 dark:text-gray-400 py-2 pr-4 w-2/5 align-top">{f.key}</td>
                                    <td className="text-xs text-brand-charcoal dark:text-gray-200 font-medium py-2">{f.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Description panel */}
                    {detailsTab === 'description' && product.description && (
                      <div className="px-4 py-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                          {product.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>{/* end right column */}
      </div>{/* end flex layout */}

      {/* Reviews Section - full width, outside the 2-col grid so image doesn't stay sticky */}
      <div className="py-6 border-t border-gray-200 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl font-semibold">
            Customer Reviews {totalReviews > 0 && <span className="text-gray-400 text-base font-normal">({totalReviews})</span>}
          </h3>
          {isAuthenticated && (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-sm text-brand-green font-medium hover:underline"
            >
              {showReviewForm ? 'Cancel' : 'Write a Review'}
            </button>
          )}
        </div>

            {/* Review Form */}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="bg-white rounded-xl p-5 mb-5 border border-gray-100">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                        className="p-1"
                      >
                        <FiStar
                          size={24}
                          className={star <= reviewForm.rating ? 'text-brand-gold fill-brand-gold' : 'text-gray-300'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Title (optional)</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Summarize your review"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-green"
                    maxLength={200}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Your Review</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    placeholder="Share your experience with this product..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-green resize-none"
                    rows={4}
                    maxLength={2000}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Photos (optional, max 4)</label>
                  <div className="flex gap-3 flex-wrap">
                    {reviewImages.map((file, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setReviewImages((imgs) => imgs.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}
                    {reviewImages.length < 4 && (
                      <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-green transition-colors">
                        <FiCamera size={20} className="text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Add</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('Image must be under 5MB');
                                return;
                              }
                              setReviewImages((imgs) => [...imgs, file]);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-primary text-sm px-6"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}

            {!isAuthenticated && (
              <p className="text-sm text-gray-500 mb-4">
                <Link href="/auth/login" className="text-brand-green hover:underline">Login</Link> to write a review.
              </p>
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review._id} className="bg-white rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              size={14}
                              className={i < review.rating ? 'text-brand-gold fill-brand-gold' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{review.user?.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                    <p className="text-sm text-gray-600">{review.comment}</p>
                    {review.images?.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {review.images.map((img, i) => (
                          <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Show More */}
                {reviews.length < totalReviews && (
                  <button
                    onClick={handleLoadMoreReviews}
                    disabled={loadingMoreReviews}
                    className="w-full py-3 text-sm font-medium text-brand-green hover:bg-green-50 rounded-xl transition-colors"
                  >
                    {loadingMoreReviews ? 'Loading...' : `Show More Reviews (${totalReviews - reviews.length} more)`}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No reviews yet. Be the first to review this product!</p>
            )}
          </div>

      {/* Suggested Products */}
      {suggestedProducts.length > 0 && (
        <div className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="font-serif text-2xl font-bold text-brand-charcoal dark:text-gray-100 mb-8">You May Also Like</h2>
          <div className="relative group/carousel">
            {/* Left Arrow */}
            <button
              onClick={() => {
                const el = document.getElementById('suggested-scroll');
                if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
              }}
              className="absolute -left-2 md:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors opacity-0 group-hover/carousel:opacity-100"
              aria-label="Scroll left"
            >
              <FiChevronLeft size={20} />
            </button>
            {/* Scrollable container */}
            <div
              id="suggested-scroll"
              className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth pb-4 -mx-1 px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {suggestedProducts.map((p) => (
                <div key={p._id} className="flex-shrink-0 w-[45%] sm:w-[32%] md:w-[23%] lg:w-[22%]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
            {/* Right Arrow */}
            <button
              onClick={() => {
                const el = document.getElementById('suggested-scroll');
                if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
              }}
              className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors opacity-0 group-hover/carousel:opacity-100"
              aria-label="Scroll right"
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
}
