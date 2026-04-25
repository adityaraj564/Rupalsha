'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiCheckCircle, FiPackage, FiTruck, FiMapPin, FiAlertCircle, FiClock, FiShoppingBag, FiDownload } from 'react-icons/fi';
import { ordersAPI, paymentAPI, returnsAPI, settingsAPI } from '@/lib/api';
import { useAuthStore, useCartStore } from '@/lib/store';
import { OrdersSkeleton } from '@/components/Skeleton';
import ReturnModal from '@/components/ReturnModal';
import ReturnTracker from '@/components/ReturnTracker';
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
  const [showShippedCancelModal, setShowShippedCancelModal] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returns, setReturns] = useState([]);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const addToCart = useCartStore((s) => s.addItem);

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

    // Load all return requests for this order
    returnsAPI.getAllByOrder(id)
      .then((data) => setReturns(data.returns || []))
      .catch(() => {});

    // Load site settings (cancellation fee config)
    settingsAPI.get()
      .then((data) => setSiteSettings(data))
      .catch(() => {});
  }, [id, isAuthenticated, router]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      const acknowledgeFee = order.status === 'shipped';
      const { order: updated } = await ordersAPI.cancel(id, cancelReason, acknowledgeFee);
      setOrder(updated);
      setShowCancel(false);
      setShowShippedCancelModal(false);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReturn = () => {
    setShowReturnModal(true);
  };

  const handleRetryPayment = async () => {
    setRetryingPayment(true);
    try {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });

      const paymentData = await paymentAPI.createOrder(order._id);

      const options = {
        key: paymentData.key,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: 'Rupalsha',
        description: `Order ${order.orderNumber}`,
        order_id: paymentData.orderId,
        handler: async (response) => {
          try {
            const { order: updated } = await paymentAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id,
            });
            setOrder(updated);
            toast.success('Payment successful!');
          } catch {
            toast.error('Payment verification failed. Contact support if money was deducted.');
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled', { icon: '⚠️' });
          },
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#1F3A2F' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'Failed to initiate payment');
    } finally {
      setRetryingPayment(false);
    }
  };

  const handleAddToCartAgain = async () => {
    try {
      for (const item of order.items) {
        await addToCart(item.product?._id || item.product, item.size);
      }
      toast.success('Items added to cart!');
      router.push('/cart');
    } catch (err) {
      toast.error(err.message || 'Failed to add items to cart');
    }
  };

  if (loading) return <OrdersSkeleton />;
  if (!order) return null;

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
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
            Order <span className="font-open-sans tracking-wide">{order.orderNumber}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-brand-green/30 dark:border-[#F8F0E8]/30 text-sm font-medium text-brand-green dark:text-[#F8F0E8] bg-white dark:bg-gray-900 hover:bg-brand-green hover:text-white dark:hover:bg-[#F8F0E8] dark:hover:text-brand-charcoal hover:shadow-md transition-all"
        >
          <span aria-hidden>←</span> All Orders
        </Link>
      </div>

      {/* Return request trackers (each non-rejected return) */}
      {returns.length > 0 && (
        <div className="space-y-4 mb-6">
          {returns.map((rr) => (
            <ReturnTracker
              key={rr._id}
              returnRequest={rr}
              onCancel={async () => {
                if (!confirm('Cancel this return request? This cannot be undone.')) return;
                try {
                  const { return: updated } = await returnsAPI.cancel(rr._id);
                  setReturns((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
                  toast.success('Return cancelled');
                } catch (err) {
                  toast.error(err.message || 'Failed to cancel return');
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Status Tracker */}
      {!['cancelled', 'returned', 'failed'].includes(order.status) && (
        <div className="card p-6 mb-6">
          <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
            <div className="flex items-center justify-between relative min-w-[420px]">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
              <div className="absolute top-4 left-0 h-0.5 bg-brand-green transition-all" style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }} />
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="relative flex flex-col items-center z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    i <= currentStep ? 'bg-brand-green text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {i <= currentStep ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-2 capitalize text-center leading-tight px-1 ${i <= currentStep ? 'text-brand-green dark:text-[#F8F0E8] font-medium' : 'text-gray-400 dark:text-gray-400'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending payment banner */}
      {order.status === 'pending' && order.paymentMethod === 'razorpay' && !order.isPaid && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FiClock className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-yellow-800 dark:text-yellow-300 font-medium">Payment Pending</p>
            <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">Complete your payment to confirm this order. The order will expire if not paid within 1 hour.</p>
            <button
              onClick={handleRetryPayment}
              disabled={retryingPayment}
              className="mt-3 px-5 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              {retryingPayment ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
          <p className="text-red-800 dark:text-red-300 font-medium">Order Cancelled</p>
          {order.cancelReason && <p className="text-red-600 dark:text-red-400 text-sm mt-1">Reason: {order.cancelReason}</p>}
          {order.cancellationFee > 0 && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              Cancellation fee deducted: ₹{order.cancellationFee.toLocaleString()}
              {order.isPaid && ` · Refund of ₹${Math.max(0, order.totalAmount - order.cancellationFee).toLocaleString()} credited to wallet`}
            </p>
          )}
        </div>
      )}

      {/* Refund Tracker (cancelled or returned orders) */}
      {['cancelled', 'returned'].includes(order.status) && order.refund && order.refund.method !== 'none' && (() => {
        const r = order.refund;
        const isWallet = r.method === 'wallet';
        const isRefunded = r.status === 'refunded';
        const isProcessing = r.status === 'processing' || (!isRefunded && r.status !== 'not_applicable');

        const refundSteps = isWallet
          ? ['Refund initiated', 'Credited to wallet']
          : ['Refund initiated', 'Processing', 'Refunded to source'];

        let currentRefundStep = 0;
        if (isWallet) {
          currentRefundStep = isRefunded ? 1 : 0;
        } else {
          currentRefundStep = isRefunded ? 2 : isProcessing ? 1 : 0;
        }

        return (
          <div className="card p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="font-serif text-lg font-semibold">Refund Status</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                isRefunded
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
              }`}>
                {isRefunded ? 'Refunded' : 'Processing'}
              </span>
            </div>

            <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
              <div className="flex items-center justify-between relative min-w-[360px]">
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
                <div
                  className="absolute top-4 left-0 h-0.5 bg-brand-green transition-all"
                  style={{ width: `${(currentRefundStep / (refundSteps.length - 1)) * 100}%` }}
                />
                {refundSteps.map((step, i) => (
                  <div key={step} className="relative flex flex-col items-center z-10 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      i <= currentRefundStep ? 'bg-brand-green text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {i <= currentRefundStep ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs mt-2 capitalize text-center leading-tight px-1 ${
                      i <= currentRefundStep ? 'text-brand-green dark:text-[#F8F0E8] font-medium' : 'text-gray-400 dark:text-gray-400'
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span className="text-gray-400">Method:</span> {isWallet ? 'Wallet credit' : 'Source account (bank/card)'}</p>
              {r.amount > 0 && (
                <p><span className="text-gray-400">Amount:</span> ₹{r.amount.toLocaleString()}</p>
              )}
              {r.refundedAt && isRefunded && (
                <p><span className="text-gray-400">Refunded on:</span> {new Date(r.refundedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              )}
              {r.reference && (
                <p><span className="text-gray-400">Reference:</span> <span className="font-mono">{r.reference}</span></p>
              )}
            </div>
            {r.notes && <p className="text-xs text-gray-500 mt-2">{r.notes}</p>}
            {!isRefunded && !isWallet && (
              <p className="text-xs text-gray-500 mt-2">
                Refund typically reflects in your account within 5–7 business days.
              </p>
            )}
          </div>
        );
      })()}

      {order.status === 'failed' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-300 font-medium">Order Failed</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">Payment was not completed within the allowed time. You can add these items to your cart and place a new order.</p>
            <button
              onClick={handleAddToCartAgain}
              className="mt-3 px-5 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors inline-flex items-center gap-2"
            >
              <FiShoppingBag size={16} /> Add to Cart Again
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Items */}
        <div className="md:col-span-2">
          {(() => {
            const itemKey = (it) => `${String(it.product?._id || it.product || '')}|${it.size || ''}`;
            const returnedKeysSet = new Set(
              returns
                .filter((r) => !['rejected', 'closed'].includes(r.status))
                .flatMap((r) => (r.items || []).map(itemKey))
            );
            const activeItems = order.items.filter((it) => !returnedKeysSet.has(itemKey(it)));
            const returnedItems = order.items.filter((it) => returnedKeysSet.has(itemKey(it)));

            const renderItem = (item, i) => (
              <Link
                key={`${itemKey(item)}-${i}`}
                href={item.product?.slug ? `/product/${item.product.slug}` : '#'}
                className="flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-2 -m-2 transition-colors"
              >
                <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium hover:text-brand-green transition-colors">{item.name}</p>
                  <p className="text-sm text-gray-500">Size: {item.size} • Qty: {item.quantity}</p>
                  <p className="font-semibold mt-1">₹{(item.price * item.quantity).toLocaleString()}</p>
                  {order.status === 'delivered' && !returnedKeysSet.has(itemKey(item)) && (
                    <span className="text-xs text-brand-green font-medium mt-1 inline-block">Tap to review →</span>
                  )}
                </div>
              </Link>
            );

            return (
              <div className="space-y-6">
                {activeItems.length > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-serif text-lg font-semibold">
                        {returnedItems.length > 0 ? 'Active Items' : 'Items'}
                      </h2>
                      <span className="text-xs text-gray-500">{activeItems.length} item{activeItems.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-4">{activeItems.map(renderItem)}</div>
                  </div>
                )}

                {returnedItems.length > 0 && (
                  <div className="card p-6 border-orange-200 dark:border-orange-800/40">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
                        <span className="inline-flex w-2.5 h-2.5 rounded-full bg-orange-400" />
                        Returned Items
                      </h2>
                      <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                        {returnedItems.length} item{returnedItems.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-4 opacity-90">
                      {returnedItems.map((item, i) => (
                        <div
                          key={`returned-${itemKey(item)}-${i}`}
                          className="flex gap-4 p-2 -m-2 rounded-xl"
                        >
                          <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.image && <Image src={item.image} alt={item.name} fill className="object-cover grayscale" sizes="80px" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">Size: {item.size} • Qty: {item.quantity}</p>
                            <p className="font-semibold mt-1">₹{(item.price * item.quantity).toLocaleString()}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                              In return
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
              {(() => {
                if (!order.isPaid) return null;
                const refundStatus = order.refund?.status;
                const refundMethod = order.refund?.method;
                const isCancelledOrReturned = ['cancelled', 'returned'].includes(order.status);

                if (isCancelledOrReturned && refundStatus === 'refunded') {
                  return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Refunded {refundMethod === 'wallet' ? '· Wallet' : refundMethod === 'source' ? '· Source' : ''}
                    </span>
                  );
                }
                if (isCancelledOrReturned && (refundStatus === 'processing' || (refundMethod && refundMethod !== 'none'))) {
                  return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                      Refund Processing
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    Paid ✓
                  </span>
                );
              })()}
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
          {(() => {
            const cancelFeeEnabled = !!siteSettings?.cancellationFeeEnabled;
            const canCancel =
              ['pending', 'confirmed', 'processing'].includes(order.status) ||
              (order.status === 'shipped' && cancelFeeEnabled);
            if (!canCancel) return null;
            return (
              <div>
                {!showCancel ? (
                  <button
                    onClick={() => {
                      if (order.status === 'shipped') {
                        setShowShippedCancelModal(true);
                      } else {
                        setShowCancel(true);
                      }
                    }}
                    className="w-full px-4 py-2.5 border-2 border-red-400 text-red-500 dark:border-red-400 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
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
            );
          })()}

          {(() => {
            const itemKey = (it) => `${String(it.product?._id || it.product || '')}|${it.size || ''}`;
            const returnedKeysSet = new Set(
              returns
                .filter((r) => !['rejected', 'closed'].includes(r.status))
                .flatMap((r) => (r.items || []).map(itemKey))
            );
            const activeItems = order.items.filter((it) => !returnedKeysSet.has(itemKey(it)));
            const hasReturnableActive =
              activeItems.length > 0 &&
              activeItems.every((it) => it.product?.isReturnable !== false);
            const showReturnButton =
              order.status === 'delivered' && hasReturnableActive;
            const showNonReturnableNotice =
              order.status === 'delivered' &&
              activeItems.length > 0 &&
              activeItems.some((it) => it.product?.isReturnable === false);
            const showInvoice =
              ['delivered', 'returned'].includes(order.status) && activeItems.length > 0;
            return (
              <>
                {showReturnButton && (
                  <div className="space-y-2">
                    <button onClick={handleReturn} className="w-full px-4 py-2.5 border-2 border-orange-400 text-orange-500 dark:border-orange-400 dark:text-orange-400 rounded-xl text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                      {returns.length > 0 ? 'Request another return' : 'Request Return'}
                    </button>
                  </div>
                )}
                {showNonReturnableNotice && (
                  <p className="text-sm text-gray-500">Some remaining items are non-returnable.</p>
                )}
                {showInvoice && (
                  <Link
                    href={`/orders/${order._id}/invoice`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2.5 border-2 border-brand-green text-brand-green dark:border-[#F8F0E8] dark:text-[#F8F0E8] rounded-xl text-sm font-medium hover:bg-brand-green/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiDownload size={16} /> Download Invoice
                  </Link>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {showReturnModal && (
        <ReturnModal
          order={order}
          returnedKeys={returns
            .filter((r) => !['rejected', 'closed'].includes(r.status))
            .flatMap((r) => (r.items || []).map((it) => `${String(it.product?._id || it.product || '')}|${it.size || ''}`))}
          onClose={() => setShowReturnModal(false)}
          onSuccess={(rr) => setReturns((prev) => [rr, ...prev])}
        />
      )}

      {showShippedCancelModal && (() => {
        const pct = siteSettings?.cancellationFeePercent ?? 50;
        const cap = siteSettings?.cancellationFeeCap ?? 100;
        const fee = Math.round(Math.min((order.totalAmount * pct) / 100, cap));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-3">
                  <FiAlertCircle className="text-orange-600 dark:text-orange-400" size={24} />
                </div>
                <h3 className="font-serif text-xl font-bold text-brand-charcoal dark:text-white">
                  Cancellation Fee Applies
                </h3>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4 mb-4">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  This order has already been shipped. {pct}% of the order amount up to ₹{cap}/- will be deducted as a Cancellation fee.
                </p>
                <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700 text-sm space-y-1">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Order total</span>
                    <span>₹{order.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600 dark:text-red-400 font-medium">
                    <span>Cancellation fee</span>
                    <span>− ₹{fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-brand-charcoal dark:text-white pt-1 border-t border-orange-200 dark:border-orange-700">
                    <span>Refund amount{order.isPaid ? ' (to wallet)' : ''}</span>
                    <span>₹{Math.max(0, order.totalAmount - fee).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm font-medium text-brand-charcoal dark:text-white mb-4">
                Do you still want to cancel the order?
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation"
                className="input-field text-sm mb-4"
                rows={2}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowShippedCancelModal(false); setCancelReason(''); }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  No, keep order
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Yes, cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
