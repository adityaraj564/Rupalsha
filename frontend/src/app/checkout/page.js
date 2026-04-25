'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiPlus, FiCreditCard, FiTruck, FiMinus, FiTrash2, FiTag } from 'react-icons/fi';
import { useAuthStore, useCartStore } from '@/lib/store';
import { ordersAPI, couponsAPI, paymentAPI, authAPI, walletAPI, settingsAPI } from '@/lib/api';
import { CartSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { items, clearCart, updateItem, removeItem } = useCartStore();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [codEnabled, setCodEnabled] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
  });
  const [fetchingPincode, setFetchingPincode] = useState(false);

  const handlePincodeLookup = async (value) => {
    const pin = value.replace(/\D/g, '').slice(0, 6);
    setNewAddress((prev) => ({ ...prev, pincode: pin }));
    if (pin.length === 6) {
      setFetchingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setNewAddress((prev) => ({ ...prev, city: po.District, state: po.State }));
        }
      } catch {}
      setFetchingPincode(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    // Re-fetch user to get latest addresses
    authAPI.getMe().then(({ user: fresh }) => {
      updateUser(fresh);
    }).catch(() => {});
    settingsAPI.get()
      .then((data) => setCodEnabled(!!data.codEnabled))
      .catch(() => {});
    walletAPI.get().then(({ balance }) => setWalletBalance(balance || 0)).catch(() => {});
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
    if (user?.addresses?.length > 0) {
      const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
      setSelectedAddress(defaultAddr);
    }
    couponsAPI.getActive().then(setAvailableCoupons).catch(() => {});
  }, [isAuthenticated, items.length, router, user]);

  if (!user || items.length === 0) return <CartSkeleton />;

  const subtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  const maxProductShipping = Math.max(...items.map(item => item.product?.shippingCharge || 0), 0);
  const shipping = subtotal >= 999 ? 0 : maxProductShipping;
  const total = subtotal + shipping - discount;
  const walletApplied = useWallet ? Math.min(walletBalance, total) : 0;
  const amountPayable = total - walletApplied;
  const walletCoversAll = walletApplied >= total && total > 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const data = await couponsAPI.validate(couponCode, subtotal);
      setDiscount(data.discount);
      setCouponApplied(data.code);
      toast.success(`Coupon applied! You save ₹${data.discount}`);
    } catch (err) {
      setCouponApplied('');
      setDiscount(0);
      setCouponCode('');
      toast.error(err.message);
    }
  };

  const handleAddAddress = async () => {
    try {
      const { authAPI } = await import('@/lib/api');
      const { addresses } = await authAPI.addAddress(newAddress);
      useAuthStore.getState().updateUser({ addresses });
      setSelectedAddress(addresses[addresses.length - 1]);
      setShowAddressForm(false);
      toast.success('Address added');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setProcessing(true);
    try {
      const effectivePaymentMethod = walletCoversAll ? 'wallet' : paymentMethod;
      const { order } = await ordersAPI.create({
        shippingAddress: selectedAddress,
        paymentMethod: effectivePaymentMethod,
        couponCode: couponApplied || undefined,
        useWallet: useWallet && !walletCoversAll,
        walletAmount: useWallet && !walletCoversAll ? walletApplied : undefined,
      });

      if (effectivePaymentMethod === 'wallet' || order.isPaid) {
        toast.success('Order placed successfully!');
        router.push(`/orders/${order._id}?success=true`);
        return;
      }

      if (effectivePaymentMethod === 'cod') {
        toast.success('Order placed successfully!');
        router.push(`/orders/${order._id}?success=true`);
        return;
      }

      // Razorpay payment
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Payment gateway failed to load. Your order is saved — you can pay from the orders page.');
        router.push(`/orders/${order._id}`);
        return;
      }

      let paymentData;
      try {
        paymentData = await paymentAPI.createOrder(order._id);
      } catch (payErr) {
        toast.error('Payment gateway error. Your order is saved — try paying from the orders page.');
        router.push(`/orders/${order._id}`);
        return;
      }

      const options = {
        key: paymentData.key,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: 'Rupalsha',
        description: `Order ${order.orderNumber}`,
        order_id: paymentData.orderId,
        handler: async (response) => {
          try {
            await paymentAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id,
            });
            toast.success('Payment successful!');
            router.push(`/orders/${order._id}?success=true`);
          } catch {
            toast.error('Payment verification failed. Contact support if money was deducted.');
            router.push(`/orders/${order._id}`);
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled. You can retry from your orders page.', { icon: '⚠️' });
            router.push(`/orders/${order._id}`);
          },
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || '',
        },
        theme: { color: '#1F3A2F' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error('Payment failed. You can retry from your orders page.');
        router.push(`/orders/${order._id}`);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12 animate-fade-in">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <div className="card p-6">
            <h2 className="font-serif text-xl font-semibold mb-4 flex items-center gap-2">
              <FiMapPin className="text-brand-green dark:text-[#F8F0E8]" /> Delivery Address
            </h2>

            {user.addresses?.length > 0 && (
              <div className="space-y-3 mb-4">
                {user.addresses.map((addr) => (
                  <label
                    key={addr._id}
                    className={`block p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedAddress?._id === addr._id ? 'border-brand-green bg-green-50/50 dark:bg-green-900/30' : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress?._id === addr._id}
                      onChange={() => setSelectedAddress(addr)}
                      className="sr-only"
                    />
                    <p className="font-medium">{addr.fullName}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{addr.phone}</p>
                  </label>
                ))}
              </div>
            )}

            {!showAddressForm ? (
              <button
                onClick={() => setShowAddressForm(true)}
                className="flex items-center gap-2 text-brand-green font-medium text-sm hover:underline"
              >
                <FiPlus size={16} /> Add New Address
              </button>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newAddress.fullName}
                    onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                    className="input-field"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={newAddress.addressLine1}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Address Line 2 (optional)"
                  value={newAddress.addressLine2}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                  className="input-field"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={newAddress.pincode}
                    onChange={(e) => handlePincodeLookup(e.target.value)}
                    className="input-field"
                    maxLength={6}
                  />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="City"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="input-field"
                    />
                    {fetchingPincode && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>}
                  </div>
                  <input
                    type="text"
                    placeholder="State"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleAddAddress} className="btn-primary text-sm py-2">Save Address</button>
                  <button onClick={() => setShowAddressForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="card p-6">
            <h2 className="font-serif text-xl font-semibold mb-4 flex items-center gap-2">
              <FiCreditCard className="text-brand-green dark:text-[#F8F0E8]" /> Payment Method
            </h2>

            {/* Wallet toggle */}
            {walletBalance > 0 ? (
              <label className="flex items-center justify-between gap-3 p-4 mb-3 border rounded-xl cursor-pointer bg-green-50/40 dark:bg-gradient-to-br dark:from-yellow-400 dark:via-amber-400 dark:to-yellow-500 border-green-600/40 dark:border-amber-600/40 dark:text-gray-900">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="accent-brand-green w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">Use Rupalsha Wallet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-900/80">
                      Balance: ₹{walletBalance.toLocaleString('en-IN')}
                      {useWallet && walletApplied > 0 && ` • Applying ₹${walletApplied.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                </div>
              </label>
            ) : (
              <div className="flex items-center justify-between gap-3 p-4 mb-3 border rounded-xl bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700">
                <div>
                  <p className="font-medium text-sm">Rupalsha Wallet</p>
                  <p className="text-xs text-gray-500">Your wallet balance is ₹0. Recharge to use it for payments.</p>
                </div>
                <a
                  href="/wallet"
                  className="text-xs font-medium text-brand-green dark:text-yellow-300 hover:underline whitespace-nowrap"
                >
                  Recharge →
                </a>
              </div>
            )}

            {walletCoversAll ? (
              <div className="p-4 border rounded-xl bg-brand-green/5 border-brand-green/30">
                <p className="text-sm">
                  Your wallet covers the full amount. No additional payment needed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                    paymentMethod === 'razorpay' ? 'border-brand-green bg-green-50/50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="accent-brand-green"
                  />
                  <div>
                    <p className="font-medium">Pay Online</p>
                    <p className="text-sm text-gray-500">UPI, Cards, Net Banking via Razorpay</p>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-4 border rounded-xl transition-colors ${
                    !codEnabled
                      ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700'
                      : `cursor-pointer ${paymentMethod === 'cod' ? 'border-brand-green bg-green-50/50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-600'}`
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={!codEnabled}
                    className="accent-brand-green"
                  />
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-gray-500">
                      {codEnabled ? 'Pay when you receive your order' : 'Currently unavailable'}
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="card p-6 sticky top-28">
            <h2 className="font-serif text-xl font-semibold mb-6">Order Summary</h2>

            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div key={item._id} className="flex items-center gap-3 text-sm">
                  <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={item.product?.images?.[0]?.url} alt="" className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.product?.name}</p>
                    <p className="text-gray-400">{item.size}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={async () => {
                          if (item.quantity <= 1) {
                            await removeItem(item._id);
                            toast.success('Item removed');
                          } else {
                            await updateItem(item._id, item.quantity - 1);
                          }
                        }}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-brand-green hover:text-brand-green transition-colors"
                      >
                        {item.quantity <= 1 ? <FiTrash2 size={12} /> : <FiMinus size={12} />}
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item._id, item.quantity + 1)}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-brand-green hover:text-brand-green transition-colors"
                      >
                        <FiPlus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-medium">₹{((item.product?.price || 0) * item.quantity).toLocaleString()}</span>
                    <button
                      onClick={async () => {
                        await removeItem(item._id);
                        toast.success('Item removed');
                      }}
                      className="block text-xs text-red-400 hover:text-red-600 mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Available Coupons */}
            {availableCoupons.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><FiTag size={12} /> Available Coupons</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableCoupons.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => { setCouponCode(c.code); }}
                      className={`w-full text-left p-2.5 border rounded-lg text-xs transition-colors ${
                        couponApplied === c.code ? 'border-brand-green bg-green-50 dark:bg-green-900/30 ring-1 ring-brand-green' : couponCode === c.code ? 'border-brand-green bg-green-50/50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-brand-green'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-brand-green">{c.code}</span>
                        <div className="flex items-center gap-2">
                          {couponApplied === c.code && <span className="text-green-600 font-medium">Applied ✓</span>}
                          <span className="text-gray-500">
                            {c.discountType === 'percentage' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                          </span>
                        </div>
                      </div>
                      {c.description && <p className="text-gray-400 mt-0.5">{c.description}</p>}
                      {c.minOrderAmount > 0 && <p className="text-gray-400 mt-0.5">Min order: ₹{c.minOrderAmount}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Coupon Code Input */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Coupon code"
                className="input-field flex-1 py-2 text-sm"
              />
              <button onClick={handleApplyCoupon} className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-opacity-90 border border-[#F8F0E8]">
                Apply
              </button>
            </div>

            <div className="space-y-3 text-sm border-t pt-4 dark:border-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className={shipping === 0 ? 'text-green-600' : ''}>
                  {shipping === 0 ? 'Free' : `₹${shipping}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({couponApplied})</span>
                  <span>-₹{discount.toLocaleString()}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
              {walletApplied > 0 && (
                <>
                  <div className="flex justify-between text-green-700 dark:text-green-400">
                    <span>Wallet applied</span>
                    <span>-₹{walletApplied.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Payable now</span>
                    <span>₹{amountPayable.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={processing || !selectedAddress}
              className="btn-primary w-full mt-6"
            >
              {processing
                ? 'Processing...'
                : walletCoversAll
                ? 'Pay from Wallet & Place Order'
                : paymentMethod === 'cod'
                ? 'Place Order (COD)'
                : 'Pay & Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
