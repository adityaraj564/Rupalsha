'use client';

// Admin shipping label / packing slip.
// Printed and pasted on the front of the package before dispatch so the
// courier can read the destination at a glance and (for COD) knows how
// much cash to collect. We deliberately use a compact A5-friendly layout
// with one BIG "TO" box and a prominent payment badge.

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminAPI, settingsAPI } from '@/lib/api';
import { AdminTableSkeleton } from '@/components/Skeleton';

export default function AdminShippingLabelPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [businessAddress, setBusinessAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      adminAPI.getOrderById(id),
      settingsAPI.get().catch(() => ({})),
    ])
      .then(([{ order: o }, s]) => {
        setOrder(o);
        setBusinessAddress(s?.businessAddress || '');
      })
      .catch((e) => setError(e?.message || 'Failed to load order'))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-open the print dialog once the data has rendered.
  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (loading) return <AdminTableSkeleton />;
  if (error) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-600">{error}</div>;
  }
  if (!order) return null;

  const addr = order.shippingAddress || {};
  const totalQty = (order.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
  const placedOn = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const isCOD = order.paymentMethod === 'cod' && !order.isPaid;

  return (
    <div className="ship-label bg-white text-black">
      <style jsx global>{`
        @media print {
          @page { size: A5; margin: 8mm; }
          html, body { background: white !important; }
          /* Hide every admin/site chrome so only the label prints */
          header, footer, nav, aside, .no-print { display: none !important; }
          /* Defeat the admin layout's padding/sidebar grid so the
             label fills the printable page area. */
          body * { visibility: hidden; }
          .ship-label, .ship-label * { visibility: visible; }
          .ship-label { position: absolute; inset: 0; padding: 0 !important; }
        }
        .ship-label { font-family: 'Helvetica', 'Arial', sans-serif; }
      `}</style>

      <div className="max-w-[148mm] mx-auto p-5 print:p-0">
        {/* Print actions (hidden when printing) */}
        <div className="no-print flex items-center justify-between mb-4 print:hidden">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-brand-green"
          >
            ← Back to orders
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-green-800"
          >
            Print / Save as PDF
          </button>
        </div>

        {/* Top strip: brand + order number */}
        <div className="border-2 border-black rounded-md overflow-hidden">
          <div className="flex items-stretch justify-between bg-black text-white px-3 py-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-80">Rupalsha</p>
              <p className="text-sm font-bold leading-tight">Shipping Label</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest opacity-80">Order</p>
              <p className="text-sm font-mono font-bold">#{order.orderNumber}</p>
            </div>
          </div>

          {/* Payment badge — biggest visual signal for the delivery agent */}
          <div className={`px-3 py-2 text-center font-extrabold uppercase tracking-wider ${
            isCOD
              ? 'bg-yellow-300 text-black border-y-2 border-black'
              : 'bg-green-600 text-white'
          }`}>
            {isCOD ? (
              <>
                <div className="text-[11px]">Cash on Delivery — collect</div>
                <div className="text-2xl leading-tight">₹{order.totalAmount?.toLocaleString('en-IN')}</div>
              </>
            ) : (
              <div className="text-sm">PREPAID — Do NOT collect cash</div>
            )}
          </div>

          {/* TO address — the most important block, large and clear */}
          <div className="px-3 py-3 border-b-2 border-black">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Deliver To</p>
            <p className="text-lg font-bold leading-snug">{addr.fullName || '—'}</p>
            <p className="text-sm leading-snug">{addr.addressLine1}</p>
            {addr.addressLine2 && <p className="text-sm leading-snug">{addr.addressLine2}</p>}
            <p className="text-sm leading-snug">
              {addr.city}{addr.city ? ', ' : ''}{addr.state}
            </p>
            <p className="text-base font-bold leading-snug">PIN — {addr.pincode || '—'}</p>
            <p className="text-sm mt-1">
              <span className="text-gray-500">Phone:</span>{' '}
              <span className="font-semibold">{addr.phone || '—'}</span>
            </p>
          </div>

          {/* FROM address + meta */}
          <div className="grid grid-cols-2 text-xs">
            <div className="px-3 py-2 border-r border-black">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">From</p>
              <p className="font-semibold">Rupalsha</p>
              {businessAddress
                ? businessAddress.split('\n').map((line, i) => (
                    <p key={i} className="leading-snug">{line}</p>
                  ))
                : <p className="text-gray-500 italic">Set business address in Admin → Settings</p>}
            </div>
            <div className="px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">Order Info</p>
              <p><span className="text-gray-500">Placed:</span> {placedOn}</p>
              <p><span className="text-gray-500">Items:</span> {order.items?.length || 0} ({totalQty} qty)</p>
              <p><span className="text-gray-500">Payment:</span> {order.paymentMethod?.toUpperCase()} {order.isPaid ? '✓ Paid' : ''}</p>
              <p className="font-bold mt-0.5">Total: ₹{order.totalAmount?.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Packing slip — items list so the packer can verify contents */}
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Packing Slip</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1 text-left">#</th>
                <th className="border border-gray-400 px-2 py-1 text-left">Item</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Size</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Qty</th>
                <th className="border border-gray-400 px-2 py-1 text-center w-8">✓</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, i) => (
                <tr key={i}>
                  <td className="border border-gray-400 px-2 py-1">{i + 1}</td>
                  <td className="border border-gray-400 px-2 py-1">
                    {item.name}
                    {item.product?.productCode && (
                      <span className="text-gray-500"> · {item.product.productCode}</span>
                    )}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{item.size || '—'}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center font-semibold">{item.quantity}</td>
                  <td className="border border-gray-400 px-2 py-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 text-[10px] text-gray-500 flex justify-between">
          <span>If undelivered, return to sender.</span>
          <span>support@rupalsha.com</span>
        </div>
      </div>
    </div>
  );
}
