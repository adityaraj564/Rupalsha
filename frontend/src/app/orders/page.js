'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiPackage, FiChevronRight } from 'react-icons/fi';
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
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
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

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 animate-fade-in">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <FiPackage size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="font-serif text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
          <Link href="/products" className="btn-primary">Shop Now</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order._id}
              href={`/orders/${order._id}`}
              className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-brand-charcoal">{order.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  • {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </p>
                <p className="font-semibold mt-1">₹{order.totalAmount.toLocaleString()}</p>
              </div>
              <FiChevronRight className="text-gray-400" size={20} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
