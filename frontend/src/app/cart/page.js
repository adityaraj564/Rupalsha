'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiMinus, FiPlus, FiTrash2, FiArrowLeft, FiShoppingBag } from 'react-icons/fi';
import { useCartStore, useAuthStore } from '@/lib/store';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function CartPage() {
  const { items, isLoading, fetchCart, updateItem, removeItem } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated, fetchCart]);

  if (authLoading || isLoading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <FiShoppingBag size={48} className="text-gray-300 mb-4" />
        <h1 className="font-serif text-2xl font-bold mb-2">Your cart is waiting</h1>
        <p className="text-gray-500 mb-6">Login to view your cart</p>
        <Link href="/auth/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <FiShoppingBag size={48} className="text-gray-300 mb-4" />
        <h1 className="font-serif text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Looks like you haven&apos;t added anything yet</p>
        <Link href="/products" className="btn-primary">Start Shopping</Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  const shipping = subtotal >= 999 ? 0 : 79;
  const total = subtotal + shipping;

  const handleQuantity = async (itemId, newQty) => {
    try {
      await updateItem(itemId, newQty);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await removeItem(itemId);
      toast.success('Removed from cart');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 animate-fade-in">
      <Link href="/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-green mb-6">
        <FiArrowLeft size={16} /> Continue Shopping
      </Link>

      <h1 className="font-serif text-3xl font-bold text-brand-charcoal mb-8">
        Shopping Cart ({items.length} item{items.length !== 1 ? 's' : ''})
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item._id} className="card p-4 md:p-6 flex gap-4">
              <Link href={`/product/${item.product?.slug}`} className="relative w-24 h-32 md:w-28 md:h-36 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                <Image
                  src={item.product?.images?.[0]?.url || '/placeholder.jpg'}
                  alt={item.product?.name || ''}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.product?.slug}`} className="font-serif font-medium text-brand-charcoal hover:text-brand-green line-clamp-2">
                  {item.product?.name}
                </Link>
                <p className="text-sm text-gray-400 mt-1">Size: {item.size}</p>
                <p className="text-lg font-semibold mt-2">₹{(item.product?.price || 0).toLocaleString()}</p>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button
                      onClick={() => handleQuantity(item._id, Math.max(1, item.quantity - 1))}
                      className="p-2 hover:bg-gray-50"
                      disabled={item.quantity <= 1}
                    >
                      <FiMinus size={14} />
                    </button>
                    <span className="px-4 text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantity(item._id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-50"
                    >
                      <FiPlus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleRemove(item._id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-28">
            <h2 className="font-serif text-xl font-semibold mb-6">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className={`font-medium ${shipping === 0 ? 'text-green-600' : ''}`}>
                  {shipping === 0 ? 'Free' : `₹${shipping}`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-gray-400">
                  Add ₹{(999 - subtotal).toLocaleString()} more for free shipping
                </p>
              )}
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>

            <Link href="/checkout" className="btn-primary w-full text-center block mt-6">
              Proceed to Checkout
            </Link>

            <p className="text-xs text-gray-400 text-center mt-4">
              Tax included. Shipping calculated at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
