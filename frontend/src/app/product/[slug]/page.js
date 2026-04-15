'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiHeart, FiShoppingBag, FiTruck, FiRefreshCw, FiChevronLeft, FiChevronRight, FiStar, FiMapPin, FiCheck, FiX, FiShare2, FiCamera, FiBell } from 'react-icons/fi';
import { productsAPI, reviewsAPI } from '@/lib/api';
import { useAuthStore, useCartStore, useWishlistStore } from '@/lib/store';
import SizeGuideModal from '@/components/SizeGuideModal';
import ProductCard from '@/components/ProductCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
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
  const pinchStartDist = useRef(null);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const addToCart = useCartStore((s) => s.addItem);
  const { isInWishlist, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlistStore();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { product: p } = await productsAPI.getBySlug(slug);
        setProduct(p);
        if (p.sizes.length === 1) setSelectedSize(p.sizes[0].size);

        // Fetch reviews
        const { reviews: r, total } = await reviewsAPI.getByProduct(p._id, { limit: 2, page: 1 });
        setReviews(r);
        setTotalReviews(total);

        // Fetch similar products (tag-based, keyword-based, excludes out-of-stock)
        productsAPI.getSimilar(slug, 20).then(({ products: similar }) => {
          setSuggestedProducts(similar);
        }).catch(() => {});
      } catch (err) {
        toast.error('Product not found');
        router.push('/products');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug, router]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add to cart');
      router.push('/auth/login');
      return;
    }
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    setAddingToCart(true);
    try {
      await addToCart(product._id, selectedSize);
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    try {
      await addToCart(product._id, selectedSize);
      router.push('/checkout');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Please login first');
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
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data[0]?.Status === 'Success') {
        const postOffice = data[0].PostOffice[0];
        setPincodeResult({
          deliverable: true,
          message: `Delivery available to ${postOffice.Name}, ${postOffice.District}, ${postOffice.State}. Estimated delivery in 5-7 business days.`,
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
      toast.error('Please login to write a review');
      router.push('/auth/login');
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

  if (loading) return <LoadingSpinner size="lg" />;
  if (!product) return null;

  const inWishlist = isAuthenticated && isInWishlist(product._id);
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const getStockForSize = (sizeName) => {
    const s = product.sizes.find((sz) => sz.size === sizeName);
    return s ? s.stock : 0;
  };

  const totalStock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
  const isOutOfStock = totalStock === 0;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12 animate-fade-in overflow-x-hidden">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8 overflow-hidden">
        <Link href="/" className="hover:text-brand-green">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-green">Shop</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category}`} className="hover:text-brand-green capitalize">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-brand-charcoal truncate">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12 overflow-hidden">
        {/* Images */}
        <div className="md:sticky md:top-24 md:self-start min-w-0">
          <div
            className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 mb-4 md:cursor-crosshair"
            onMouseMove={(e) => {
              if (window.innerWidth < 768) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setZoomStyle({
                display: 'block',
                backgroundImage: `url(${product.images[selectedImage]?.url})`,
                backgroundSize: '250%',
                backgroundPosition: `${x}% ${y}%`,
              });
            }}
            onMouseLeave={() => setZoomStyle({ display: 'none' })}
            onTouchStart={(e) => {
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
            <Image
              src={product.images[selectedImage]?.url || '/placeholder.jpg'}
              alt={product.name}
              fill
              className="object-cover pointer-events-none transition-transform duration-150"
              style={{ transform: `scale(${pinchScale})`, transformOrigin: pinchOrigin }}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div
              className="absolute inset-0 z-10 rounded-2xl hidden md:block"
              style={zoomStyle}
            />
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
                >
                  <FiChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
                >
                  <FiChevronRight size={20} />
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
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 max-w-full">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-24 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    selectedImage === i ? 'border-brand-green' : 'border-transparent'
                  }`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0">
          <p className="text-brand-gold text-sm font-medium uppercase tracking-wider mb-2">{product.category}</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">{product.name}</h1>

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
            <span className="text-3xl font-bold text-brand-charcoal">₹{product.price.toLocaleString()}</span>
            {product.comparePrice && (
              <span className="text-xl text-gray-400 line-through">₹{product.comparePrice.toLocaleString()}</span>
            )}
          </div>
          {product.comparePrice && discount > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <span className="bg-green-100 text-green-700 text-sm font-medium px-2 py-0.5 rounded-full">
                Save {discount}%
              </span>
              <span className="text-sm text-gray-500">
                MRP: <span className="line-through">₹{product.comparePrice.toLocaleString()}</span>
              </span>
            </div>
          )}
          {!(product.comparePrice && discount > 0) && <div className="mb-6" />}

          {/* Description */}
          <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

          {/* Fabric */}
          {product.fabric && (
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-brand-charcoal">Fabric:</span> {product.fabric}
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
          <div className="mb-8 sticky bottom-0 bg-brand-cream md:static md:bg-transparent py-4 md:py-0 -mx-4 px-4 md:mx-0 md:px-0 border-t md:border-0 border-gray-200 space-y-3">
            <div className="flex gap-3">
              {isOutOfStock ? (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('Please login first');
                      router.push('/auth/login');
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
              <span>Free shipping on orders above ₹999</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <FiRefreshCw className="text-brand-green flex-shrink-0" size={18} />
              <span>{product.returnPolicy}</span>
            </div>
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

          {/* Reviews Section */}
          <div className="py-6 border-t border-gray-200">
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
        </div>
      </div>

      {/* Suggested Products */}
      {suggestedProducts.length > 0 && (
        <div className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="font-serif text-2xl font-bold text-brand-charcoal mb-8">You May Also Like</h2>
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
