'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      const params = { limit: 50 };
      if (filterStatus) params.status = filterStatus;
      const data = await adminAPI.getOrders(params);
      setOrders(data.orders);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await adminAPI.updateOrderStatus(orderId, { status });
      setOrders(orders.map(o => o._id === orderId ? { ...o, status } : o));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-brand-charcoal mb-6">Orders ({orders.length})</h1>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${!filterStatus ? 'bg-brand-green text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
        >
          All
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${filterStatus === s ? 'bg-brand-green text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="p-4 font-medium">Order</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Items</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Payment</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-medium">{order.orderNumber}</td>
                  <td className="p-4">
                    <p className="font-medium">{order.user?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-400">{order.user?.email}</p>
                  </td>
                  <td className="p-4 text-gray-600">{order.items?.length || 0}</td>
                  <td className="p-4 font-medium">₹{order.totalAmount?.toLocaleString()}</td>
                  <td className="p-4">
                    <span className="text-xs capitalize">{order.paymentMethod}</span>
                    {order.isPaid && <span className="text-green-600 ml-1">✓</span>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-4">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s} className="capitalize">{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <p className="text-center text-gray-500 py-10">No orders found</p>
        )}
      </div>
    </div>
  );
}
