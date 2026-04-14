'use client';

import { useEffect, useState } from 'react';
import { FiShoppingCart, FiDollarSign, FiUsers, FiPackage } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p>Failed to load dashboard</p>;

  const stats = [
    { label: 'Total Orders', value: data.totalOrders, icon: FiShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Revenue', value: `₹${data.totalRevenue.toLocaleString()}`, icon: FiDollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Users', value: data.totalUsers, icon: FiUsers, color: 'bg-purple-50 text-purple-600' },
    { label: 'Pending', value: data.ordersByStatus?.pending || 0, icon: FiPackage, color: 'bg-yellow-50 text-yellow-600' },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-brand-charcoal mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-brand-charcoal">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Order Status Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Order Status</h2>
          <div className="space-y-3">
            {Object.entries(data.ordersByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{status}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-brand-green h-2 rounded-full"
                      style={{ width: `${Math.min(100, (count / data.totalOrders) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Order</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders?.map((order) => (
                <tr key={order._id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{order.orderNumber}</td>
                  <td className="py-3 text-gray-600">{order.user?.name || 'N/A'}</td>
                  <td className="py-3">₹{order.totalAmount.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize
                      ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
