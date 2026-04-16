'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiPackage, FiChevronRight, FiSearch, FiChevronDown } from 'react-icons/fi';
import { ordersAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import LoadingSpinner from '@/components/LoadingSpinner';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount_high', label: 'Amount: High to Low' },
  { value: 'amount_low', label: 'Amount: Low to High' },
];

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
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
    ordersAPI.getAll({ limit: 50 })
      .then((data) => setOrders(data.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  if (loading) return <LoadingSpinner />;

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal mb-6">My Orders</h1>

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
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? `All (${orders.length})` : `${s} (${orders.filter((o) => o.status === s).length})`}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {filtered.length === 0 ? (
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
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
          )}
        </>
      )}
    </div>
  );
}
