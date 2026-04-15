'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiHeart, FiTrash2 } from 'react-icons/fi';
import { useAuthStore, useWishlistStore } from '@/lib/store';
import ProductCard from '@/components/ProductCard';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function WishlistPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const { items, fetchWishlist } = useWishlistStore();

  useEffect(() => {
    if (isAuthenticated) fetchWishlist();
  }, [isAuthenticated, fetchWishlist]);

  if (authLoading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <FiHeart size={48} className="text-gray-300 mb-4" />
        <h1 className="font-serif text-2xl font-bold mb-2">Your Wishlist</h1>
        <p className="text-gray-500 mb-6">Login to view your wishlist</p>
        <Link href="/auth/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12 animate-fade-in">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal mb-8">
        My Wishlist ({items.length})
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <FiHeart size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="font-serif text-xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-6">Save items you love for later</p>
          <Link href="/products" className="btn-primary">Explore Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
