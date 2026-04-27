'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiPackage, FiChevronRight, FiSearch, FiChevronDown, FiRotateCcw, FiArrowLeft } from 'react-icons/fi';
import { ordersAPI, returnsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { OrdersSkeleton } from '@/components/Skeleton';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  processing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  returned: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount_high', label: 'Amount: High to Low' },
  { value: 'amount_low', label: 'Amount: Low to High' },
];

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'returns'];

const RETURN_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  pickup_scheduled: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  picked_up: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  received: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  refunded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

// Cached snapshot of the last orders+returns response. Lets the page paint
// instantly on revisits while we revalidate against the server in the
// background. Status badges remain accurate within one round-trip.
const ORDERS_CACHE_KEY = 'rupalsha_orders_cache';
const readCachedOrders = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ORDERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const writeCachedOrders = (data) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(data)); } catch {}
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Paint cached orders synchronously, then revalidate.
    const cached = readCachedOrders();
    if (cached) {
      setOrders(cached.orders || []);
      setReturns(cached.returns || []);
      setLoading(false);
    }

    Promise.all([
      ordersAPI.getAll({ limit: 50 }).then((d) => d.orders).catch(() => null),
      returnsAPI.getMine().then((d) => d.returns || []).catch(() => null),
    ]).then(([ord, rets]) => {
      // Only overwrite state on success; null means keep cached data.
      const nextOrders = ord ?? cached?.orders ?? [];
      const nextReturns = rets ?? cached?.returns ?? [];
      setOrders(nextOrders);
      setReturns(nextReturns);
      writeCachedOrders({ orders: nextOrders, returns: nextReturns });
    }).finally(() => setLoading(false));
  }, [isAuthenticated, isLoading, router]);

  if (loading && orders.length === 0) return <OrdersSkeleton />;

  // Filter and sort
  let filtered = orders;
  if (statusFilter !== 'all') {
    filtered = filtered.filter((o) => o.status === statusFilter);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((o) =>
      o.orderNumber?.toLowerCase().includes(q) ||
      o.items.some((item) => item.name?.toLowerCase().includes(q))
    );
  }
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'amount_high') return b.totalAmount - a.totalAmount;
    if (sortBy === 'amount_low') return a.totalAmount - b.totalAmount;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Map of orderId -> active return (non-terminal) for quick lookup
  const activeReturnByOrder = {};
  for (const r of returns) {
    if (['refunded', 'rejected', 'closed'].includes(r.status)) continue;
    const oid = r.order?._id || r.order;
    if (oid) activeReturnByOrder[String(oid)] = r;
  }
  // Also include terminal refunded so we can show "Refunded" badge
  const anyReturnByOrder = {};
  for (const r of returns) {
    const oid = r.order?._id || r.order;
    if (oid && !anyReturnByOrder[String(oid)]) anyReturnByOrder[String(oid)] = r;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) router.back();
            else router.push('/profile');
          }}
          aria-label="Go back"
          className="h-10 w-10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <FiArrowLeft size={20} />
        </button>
        <h1 className="font-serif text-3xl font-bold text-brand-charcoal dark:text-gray-100">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <FiPackage size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="font-serif text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
          <Link href="/products" className="btn-primary">Shop Now</Link>
        </div>
      ) : (
        <>
          {/* Search and Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by order number or product name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 w-full"
              />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field pr-8 appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
            {STATUS_FILTERS.map((s) => {
              const count =
                s === 'all'
                  ? orders.length
                  : s === 'returns'
                  ? returns.length
                  : orders.filter((o) => o.status === s).length;
              const label = s === 'all' ? 'All' : s === 'returns' ? 'Returns' : s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                    statusFilter === s
                      ? 'bg-brand-green text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {/* Returns List */}
          {statusFilter === 'returns' ? (
            returns.length === 0 ? (
              <div className="text-center py-12">
                <FiRotateCcw size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">You haven&apos;t requested any returns yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {returns
                  .filter((r) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return (
                      r.returnNumber?.toLowerCase().includes(q) ||
                      r.order?.orderNumber?.toLowerCase().includes(q) ||
                      r.items?.some((it) => it.name?.toLowerCase().includes(q))
                    );
                  })
                  .map((r) => (
                    <Link
                      key={r._id}
                      href={`/orders/${r.order?._id || r.order}`}
                      className="card p-5 flex gap-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex -space-x-2 flex-shrink-0">
                        {r.items?.slice(0, 3).map((item, i) => (
                          <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                            {item.image ? (
                              <Image src={item.image} alt={item.name || ''} fill className="object-cover" sizes="56px" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <FiPackage className="text-gray-300" size={16} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-medium text-brand-charcoal dark:text-white">{r.returnNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RETURN_STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                            {r.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          Order: {r.order?.orderNumber || '—'} · {r.items?.map((i) => i.name).join(', ')}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          {r.refundAmount > 0 && (
                            <span className="font-semibold">₹{r.refundAmount.toLocaleString()}</span>
                          )}
                          <span className="text-gray-400">
                            {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-gray-400 capitalize">· Refund: {r.refundMethod === 'wallet' ? 'Wallet' : 'Original source'}</span>
                        </div>
                      </div>
                      <FiChevronRight className="text-gray-400 flex-shrink-0 self-center" size={20} />
                    </Link>
                  ))}
              </div>
            )
          ) : (
          /* Orders List */
          filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No orders match your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((order) => (
                <Link
                  key={order._id}
                  href={`/orders/${order._id}`}
                  className="card p-5 flex gap-4 hover:shadow-md transition-shadow"
                >
                  {/* Product Images */}
                  <div className="flex -space-x-2 flex-shrink-0">
                    {order.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        {item.image ? (
                          <Image src={item.image} alt={item.name || ''} fill className="object-cover" sizes="56px" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <FiPackage className="text-gray-300" size={16} />
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-14 h-14 rounded-lg border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-gray-500 font-medium">+{order.items.length - 3}</span>
                      </div>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-brand-charcoal">{order.orderNumber}</span>
                      {(() => {
                        const ret = activeReturnByOrder[String(order._id)] || anyReturnByOrder[String(order._id)];
                        if (ret && ret.status !== 'closed') {
                          const retLabel =
                            ret.status === 'refunded'
                              ? 'Refunded'
                              : ret.status === 'rejected'
                              ? 'Return rejected'
                              : `Return ${ret.status?.replace('_', ' ')}`;
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RETURN_STATUS_COLORS[ret.status] || 'bg-gray-100 text-gray-700'}`}>
                              {retLabel}
                            </span>
                          );
                        }
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status]}`}>
                            {order.status}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {order.items.map((item) => item.name).join(', ')}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-semibold">₹{order.totalAmount.toLocaleString()}</span>
                      <span className="text-sm text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-sm text-gray-400">• {order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <FiChevronRight className="text-gray-400 flex-shrink-0 self-center" size={20} />
                </Link>
              ))}
            </div>
          )
          )}
        </>
      )}
    </div>
  );
}
