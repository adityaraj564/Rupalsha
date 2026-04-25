'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ordersAPI, returnsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { OrdersSkeleton } from '@/components/Skeleton';

export default function InvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [order, setOrder] = useState(null);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    Promise.all([
      ordersAPI.getById(id),
      returnsAPI.getAllByOrder(id).catch(() => ({ returns: [] })),
    ])
      .then(([orderData, returnsData]) => {
        const o = orderData.order;
        if (o.status !== 'delivered') {
          setError('Invoice is only available for delivered orders.');
          return;
        }
        setOrder(o);
        setReturns(returnsData.returns || []);
      })
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, isLoading, router]);

  // Auto-trigger print once data is ready
  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (loading) return <OrdersSkeleton />;
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">{error}</div>
    );
  }
  if (!order) return null;

  // Filter out items in non-rejected returns
  const itemKey = (it) => `${String(it.product?._id || it.product || '')}|${it.size || ''}`;
  const returnedKeysSet = new Set(
    (returns || [])
      .filter((r) => !['rejected', 'closed'].includes(r.status))
      .flatMap((r) => (r.items || []).map(itemKey))
  );
  const invoiceItems = (order.items || []).filter((it) => !returnedKeysSet.has(itemKey(it)));

  if (invoiceItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600 text-center px-4">
        All items in this order have been returned. No invoice is available.
      </div>
    );
  }

  const invoiceItemsTotal = invoiceItems.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);
  const invoiceShipping = order.shippingCharge || 0;
  const invoiceDiscount = order.discount || 0;
  const invoiceTotal = Math.max(0, invoiceItemsTotal + invoiceShipping - invoiceDiscount);

  const addr = order.shippingAddress || {};
  const placedOn = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const deliveredOn = order.deliveredAt
    ? new Date(order.deliveredAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="invoice-page bg-white text-black min-h-screen">
      <style jsx global>{`
        @media print {
          @page { margin: 12mm; }
          body { background: white !important; }
          header, footer, nav, .no-print { display: none !important; }
        }
        .invoice-page { font-family: 'Georgia', serif; }
      `}</style>

      <div className="max-w-3xl mx-auto p-8">
        {/* Print actions (hidden when printing) */}
        <div className="no-print flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-brand-green"
          >
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-green-800"
          >
            Print / Save as PDF
          </button>
        </div>

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F3A2F]">Rupalsha</h1>
            <p className="text-xs text-[#C8A951]">Where Comfort Meets Style</p>
            <p className="text-xs text-gray-500 mt-1">support@rupalsha.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold uppercase tracking-wider">Invoice</h2>
            <p className="text-sm text-gray-600 mt-1">#{order.orderNumber}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Billed To</p>
            <p className="font-semibold">{addr.fullName}</p>
            <p>{addr.addressLine1}</p>
            {addr.addressLine2 && <p>{addr.addressLine2}</p>}
            <p>
              {addr.city}, {addr.state} - {addr.pincode}
            </p>
            <p className="mt-1">Phone: {addr.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Order Details</p>
            <p>
              <span className="text-gray-500">Order #:</span> {order.orderNumber}
            </p>
            <p>
              <span className="text-gray-500">Order date:</span> {placedOn}
            </p>
            <p>
              <span className="text-gray-500">Delivered:</span> {deliveredOn}
            </p>
            <p>
              <span className="text-gray-500">Payment:</span>{' '}
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}
              {order.isPaid ? ' — Paid' : ''}
            </p>
            {order.paymentResult?.razorpay_payment_id && (
              <p className="text-xs text-gray-500 break-all">
                Txn: {order.paymentResult.razorpay_payment_id}
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border border-gray-300 font-semibold">#</th>
              <th className="p-2 border border-gray-300 font-semibold">Item</th>
              <th className="p-2 border border-gray-300 font-semibold">Size</th>
              <th className="p-2 border border-gray-300 font-semibold text-center">Qty</th>
              <th className="p-2 border border-gray-300 font-semibold text-right">Price</th>
              <th className="p-2 border border-gray-300 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item, i) => (
              <tr key={i}>
                <td className="p-2 border border-gray-300">{i + 1}</td>
                <td className="p-2 border border-gray-300">{item.name}</td>
                <td className="p-2 border border-gray-300">{item.size}</td>
                <td className="p-2 border border-gray-300 text-center">{item.quantity}</td>
                <td className="p-2 border border-gray-300 text-right">
                  ₹{item.price.toLocaleString()}
                </td>
                <td className="p-2 border border-gray-300 text-right">
                  ₹{(item.price * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {returnedKeysSet.size > 0 && (
          <p className="text-xs text-gray-500 italic mb-4">
            Note: Returned items have been excluded from this invoice.
          </p>
        )}

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-600">Subtotal</span>
              <span>₹{invoiceItemsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-600">Shipping</span>
              <span>{invoiceShipping === 0 ? 'Free' : `₹${invoiceShipping}`}</span>
            </div>
            {invoiceDiscount > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">
                  Discount {order.couponCode ? `(${order.couponCode})` : ''}
                </span>
                <span>-₹{invoiceDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-800 font-bold text-base">
              <span>Total</span>
              <span>₹{invoiceTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-xs text-gray-500 text-center">
          <p>Thank you for shopping with Rupalsha.</p>
          <p className="mt-1">
            For any queries, write to support@rupalsha.com. This is a system-generated invoice.
          </p>
        </div>
      </div>
    </div>
  );
}
