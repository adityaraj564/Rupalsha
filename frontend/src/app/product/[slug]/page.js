'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiHeart, FiShoppingBag, FiTruck, FiRefreshCw, FiChevronLeft, FiChevronRight, FiStar } from 'react-icons/fi';
import { productsAPI, reviewsAPI } from '@/lib/api';
import { useAuthStore, useCartStore, useWishlistStore } from '@/lib/store';
import SizeGuideModal from '@/components/SizeGuideModal';
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
  const [addingToCart, setAddingToCart] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToCart = useCartStore((s) => s.addItem);
  const { isInWishlist, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlistStore();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { product: p } = await productsAPI.getBySlug(slug);
        setProduct(p);
        if (p.sizes.length === 1) setSelectedSize(p.sizes[0].size);

        // Fetch reviews
        const { reviews: r } = await reviewsAPI.getByProduct(p._id, { limit: 5 });
        setReviews(r);
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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Link href="/" className="hover:text-brand-green">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-green">Shop</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category}`} className="hover:text-brand-green capitalize">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-brand-charcoal">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        {/* Images */}
        <div>
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 mb-4">
            <Image
              src={product.images[selectedImage]?.url || '/placeholder.jpg'}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
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
            <div className="flex gap-3 overflow-x-auto pb-2">
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
        <div className="md:sticky md:top-28 md:self-start">
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
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold text-brand-charcoal">₹{product.price.toLocaleString()}</span>
            {product.comparePrice && (
              <>
                <span className="text-xl text-gray-400 line-through">₹{product.comparePrice.toLocaleString()}</span>
                <span className="bg-green-100 text-green-700 text-sm font-medium px-2 py-0.5 rounded-full">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

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
              <button
                onClick={() => setSizeGuideOpen(true)}
                className="text-sm text-brand-green hover:underline"
              >
                Size Guide
              </button>
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
          <div className="flex gap-3 mb-8 sticky bottom-0 bg-brand-cream md:static md:bg-transparent py-4 md:py-0 -mx-4 px-4 md:mx-0 md:px-0 border-t md:border-0 border-gray-200">
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <FiShoppingBag size={18} />
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </button>
            <button onClick={handleBuyNow} className="btn-gold flex-1">
              Buy Now
            </button>
            <button
              onClick={handleWishlist}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
                inWishlist ? 'border-red-400 text-red-500' : 'border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500'
              }`}
            >
              <FiHeart size={20} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
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

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <div className="py-6 border-t border-gray-200">
              <h3 className="font-serif text-xl font-semibold mb-4">Customer Reviews</h3>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review._id} className="bg-white rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
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
                    {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                    <p className="text-sm text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
}
