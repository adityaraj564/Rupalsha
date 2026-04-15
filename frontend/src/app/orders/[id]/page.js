'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiCheckCircle, FiPackage, FiTruck, FiMapPin } from 'react-icons/fi';
import { ordersAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  const isSuccess = searchParams.get('success') === 'true';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    ordersAPI.getById(id)
      .then((data) => setOrder(data.order))
      .catch(() => { toast.error('Order not found'); router.push('/orders'); })
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, router]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      const { order: updated } = await ordersAPI.cancel(id, cancelReason);
      setOrder(updated);
      setShowCancel(false);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReturn = async () => {
    const reason = prompt('Reason for return:');
    if (!reason) return;
    try {
      const { order: updated } = await ordersAPI.returnOrder(id, reason);
      setOrder(updated);
      toast.success('Return request submitted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return null;

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 animate-fade-in">
      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center mb-8">
          <FiCheckCircle className="text-green-600 mx-auto mb-3" size={48} />
          <h2 className="font-serif text-2xl font-bold text-green-800 mb-2">Order Placed Successfully!</h2>
          <p className="text-green-700">Thank you for shopping with Rupalsha</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-charcoal">
            Order {order.orderNumber}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/orders" className="text-sm text-brand-green hover:underline">
          ← All Orders
        </Link>
      </div>

      {/* Status Tracker */}
      {!['cancelled', 'returned'].includes(order.status) && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
            <div className="absolute top-4 left-0 h-0.5 bg-brand-green transition-all" style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }} />
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="relative flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  i <= currentStep ? 'bg-brand-green text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i <= currentStep ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-2 capitalize hidden md:block ${i <= currentStep ? 'text-brand-green font-medium' : 'text-gray-400'}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800 font-medium">Order Cancelled</p>
          {order.cancelReason && <p className="text-red-600 text-sm mt-1">Reason: {order.cancelReason}</p>}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Items */}
        <div className="md:col-span-2">
          <div className="card p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Items</h2>
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <Link
                  key={i}
                  href={item.product?.slug ? `/product/${item.product.slug}` : '#'}
                  className="flex gap-4 hover:bg-gray-50 rounded-xl p-2 -m-2 transition-colors"
                >
                  <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium hover:text-brand-green transition-colors">{item.name}</p>
                    <p className="text-sm text-gray-500">Size: {item.size} • Qty: {item.quantity}</p>
                    <p className="font-semibold mt-1">₹{(item.price * item.quantity).toLocaleString()}</p>
                    {order.status === 'delivered' && (
                      <span className="text-xs text-brand-green font-medium mt-1 inline-block">Tap to review →</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Items</span><span>₹{order.itemsTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{order.shippingCharge === 0 ? 'Free' : `₹${order.shippingCharge}`}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discount}</span></div>}
              <hr />
              <div className="flex justify-between font-semibold text-base"><span>Total</span><span>₹{order.totalAmount.toLocaleString()}</span></div>
              <p className="text-gray-500 capitalize">Payment: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}</p>
              {order.isPaid && <p className="text-green-600">Paid ✓</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2">
              <FiMapPin size={16} /> Delivery Address
            </h2>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-brand-charcoal">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
              <p>{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Actions */}
          {['pending', 'confirmed', 'processing'].includes(order.status) && (
            <div>
              {!showCancel ? (
                <button onClick={() => setShowCancel(true)} className="text-red-500 text-sm hover:underline">
                  Cancel Order
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation"
                    className="input-field text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCancel} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Confirm Cancel</button>
                    <button onClick={() => setShowCancel(false)} className="text-sm text-gray-500">Nevermind</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {order.status === 'delivered' && (
            <button onClick={handleReturn} className="text-orange-500 text-sm hover:underline">
              Request Return
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
