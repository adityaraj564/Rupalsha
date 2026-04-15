'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiHeart, FiEye } from 'react-icons/fi';
import { useAuthStore, useWishlistStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isInWishlist, addItem, removeItem } = useWishlistStore();
  const inWishlist = isAuthenticated && isInWishlist(product._id);
  const [currentImage, setCurrentImage] = useState(0);
  const intervalRef = useRef(null);
  const hasMultipleImages = product.images?.length > 1;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
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

  const startSlide = () => {
    if (!hasMultipleImages) return;
    intervalRef.current = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % product.images.length);
    }, 2000);
  };

  const stopSlide = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentImage(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className={`card overflow-hidden ${isOutOfStock ? 'opacity-60' : ''}`}>
        {/* Image */}
        <div
          className="relative aspect-[3/4] overflow-hidden bg-gray-100 product-image-zoom"
          onMouseEnter={startSlide}
          onMouseLeave={stopSlide}
        >
          <Image
            src={product.images?.[currentImage]?.url || product.images?.[0]?.url || '/placeholder.jpg'}
            alt={product.images?.[currentImage]?.alt || product.name}
            fill
            className={`object-cover transition-opacity duration-500 ${isOutOfStock ? 'grayscale' : ''}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
          />

          {/* Image dots indicator */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
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
              <span className="bg-brand-gold text-white text-xs font-semibold px-2 py-1 rounded-full">
                -{discount}%
              </span>
            )}
            {product.isTrending && (
              <span className="bg-brand-green text-white text-xs font-semibold px-2 py-1 rounded-full">
                Trending
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handleWishlist}
              className={`w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center transition-colors ${
                inWishlist ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
              }`}
            >
              <FiHeart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Quick View */}
          <div className="absolute bottom-0 left-0 right-0 bg-brand-green/90 text-white text-center py-3 text-sm font-medium translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <FiEye className="inline mr-2" size={16} />
            Quick View
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{product.category}</p>
          <h3 className="font-serif text-sm md:text-base font-medium text-brand-charcoal line-clamp-2 group-hover:text-brand-green transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-semibold text-brand-charcoal">₹{product.price.toLocaleString()}</span>
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
