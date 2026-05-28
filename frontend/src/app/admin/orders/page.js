'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiTrash2, FiAlertTriangle, FiX, FiEye, FiMapPin, FiUser, FiPhone, FiMail, FiPackage, FiCreditCard, FiCopy, FiTruck, FiDollarSign, FiPrinter } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import { AdminTableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const handleRefundUpdate = async (orderId, payload) => {
    try {
      const { order: updated } = await adminAPI.updateOrderRefund(orderId, payload);
      setOrders(orders.map(o => o._id === orderId ? updated : o));
      if (selectedOrder && selectedOrder._id === orderId) setSelectedOrder(updated);
      toast.success('Refund updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteConfirm) return;
    try {
      await adminAPI.deleteOrder(deleteConfirm._id);
      setOrders(orders.filter(o => o._id !== deleteConfirm._id));
      toast.success('Order deleted');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (loading) return <AdminTableSkeleton />;

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-left text-gray-500 dark:text-gray-300">
                <th className="p-4 font-medium">Order</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Items</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Payment</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Refund</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <td className="p-4 font-medium text-brand-green">{order.orderNumber}</td>
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
                  <td className="p-4">
                    {(() => {
                      if (!['cancelled', 'returned'].includes(order.status)) {
                        return <span className="text-xs text-gray-400">—</span>;
                      }
                      const r = order.refund || {};
                      const status = r.status || (order.isPaid ? 'processing' : 'not_applicable');
                      const method = r.method || (order.isPaid ? 'wallet' : 'none');
                      if (method === 'none' || status === 'not_applicable') {
                        return <span className="text-xs text-gray-400">N/A</span>;
                      }
                      const cls = status === 'refunded'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize w-fit ${cls}`}>
                            {status === 'refunded' ? 'Refunded' : 'Processing'}
                          </span>
                          <span className="text-[10px] text-gray-400 capitalize">
                            {method === 'wallet' ? 'Wallet' : 'Source'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                        title="View details"
                      >
                        <FiEye size={14} />
                      </button>
                      <Link
                        href={`/admin/orders/${order._id}/label`}
                        target="_blank"
                        rel="noopener"
                        className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"
                        title="Print shipping label"
                      >
                        <FiPrinter size={14} />
                      </Link>
                      {['cancelled', 'returned'].includes(order.status) && (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-600 transition-colors"
                          title="Manage refund"
                        >
                          <FiDollarSign size={14} />
                        </button>
                      )}
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setDeleteConfirm(order)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                        title="Delete order"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl my-8 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-brand-charcoal">Order #{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-gray-500">
                  {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[selectedOrder.status]}`}>
                  {selectedOrder.status}
                </span>
                <Link
                  href={`/admin/orders/${selectedOrder._id}/label`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                  title="Open printable shipping label in a new tab"
                >
                  <FiPrinter size={14} /> Print Label
                </Link>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <FiX size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Customer Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <h4 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FiUser size={16} /> Customer Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm dark:text-gray-200">
                  <p className="flex items-center gap-2"><FiUser size={14} className="text-gray-400" /> {selectedOrder.user?.name || 'N/A'}</p>
                  <p className="flex items-center gap-2"><FiMail size={14} className="text-gray-400" /> {selectedOrder.user?.email || 'N/A'}</p>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <h4 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FiMapPin size={16} /> Delivery Address
                </h4>
                {selectedOrder.shippingAddress ? (
                  <div className="text-sm space-y-1 dark:text-gray-200">
                    <p className="font-medium">{selectedOrder.shippingAddress.fullName}</p>
                    <p className="flex items-center gap-2"><FiPhone size={14} className="text-gray-400" /> {selectedOrder.shippingAddress.phone}</p>
                    <p>{selectedOrder.shippingAddress.addressLine1}</p>
                    {selectedOrder.shippingAddress.addressLine2 && <p>{selectedOrder.shippingAddress.addressLine2}</p>}
                    <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} — {selectedOrder.shippingAddress.pincode}</p>
                    <button
                      onClick={() => {
                        const addr = selectedOrder.shippingAddress;
                        const text = `${addr.fullName}\n${addr.phone}\n${addr.addressLine1}${addr.addressLine2 ? '\n' + addr.addressLine2 : ''}\n${addr.city}, ${addr.state} - ${addr.pincode}`;
                        navigator.clipboard.writeText(text);
                        toast.success('Address copied!');
                      }}
                      className="mt-2 text-xs text-brand-green hover:underline flex items-center gap-1"
                    >
                      <FiCopy size={12} /> Copy address
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No address provided</p>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-sm text-brand-charcoal mb-3 flex items-center gap-2">
                  <FiPackage size={16} /> Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">Size: {item.size} &middot; Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-sm whitespace-nowrap">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Totals */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FiCreditCard size={16} /> Payment Details
                </h4>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method</span>
                    <span className="capitalize font-medium">{selectedOrder.paymentMethod} {selectedOrder.isPaid ? '(Paid ✓)' : '(Unpaid)'}</span>
                  </div>
                  {selectedOrder.paymentResult?.razorpay_payment_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment ID</span>
                      <span className="text-xs font-mono">{selectedOrder.paymentResult.razorpay_payment_id}</span>
                    </div>
                  )}
                  <hr />
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>₹{selectedOrder.itemsTotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span className={selectedOrder.shippingCharge === 0 ? 'text-green-600' : ''}>
                      {selectedOrder.shippingCharge === 0 ? 'Free' : `₹${selectedOrder.shippingCharge}`}
                    </span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Discount {selectedOrder.couponCode && `(${selectedOrder.couponCode})`}</span>
                      <span className="text-green-600">-₹{selectedOrder.discount?.toLocaleString()}</span>
                    </div>
                  )}
                  <hr />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>₹{selectedOrder.totalAmount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Update Status */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600">Update Status:</label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    handleStatusUpdate(selectedOrder._id, e.target.value);
                    setSelectedOrder({ ...selectedOrder, status: e.target.value });
                  }}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 flex-1"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>

              {/* Refund Tracking */}
              {['cancelled', 'returned'].includes(selectedOrder.status) && (
                <RefundEditor
                  order={selectedOrder}
                  onSave={(payload) => handleRefundUpdate(selectedOrder._id, payload)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="text-red-500" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-brand-charcoal">Delete Order</h3>
            </div>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this order?
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-6">
              <p className="font-medium text-sm">Order #{deleteConfirm.orderNumber}</p>
              <p className="text-xs text-gray-500">
                {deleteConfirm.user?.name || 'N/A'} &middot; ₹{deleteConfirm.totalAmount?.toLocaleString()} &middot; {deleteConfirm.items?.length || 0} item{deleteConfirm.items?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-xs text-red-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <FiX size={16} /> Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <FiTrash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RefundEditor({ order, onSave }) {
  const initial = order.refund || {};
  const [method, setMethod] = useState(initial.method || 'none');
  const [status, setStatus] = useState(initial.status || 'not_applicable');
  const [amount, setAmount] = useState(initial.amount ?? Math.max(0, (order.totalAmount || 0) - (order.cancellationFee || 0)));
  const [reference, setReference] = useState(initial.reference || '');
  const [notes, setNotes] = useState(initial.notes || '');

  // Re-sync when a different order is opened
  useEffect(() => {
    const r = order.refund || {};
    setMethod(r.method || 'none');
    setStatus(r.status || 'not_applicable');
    setAmount(r.amount ?? Math.max(0, (order.totalAmount || 0) - (order.cancellationFee || 0)));
    setReference(r.reference || '');
    setNotes(r.notes || '');
  }, [order._id]);

  const handleSave = (e) => {
    e.preventDefault();
    onSave({
      method,
      status,
      amount: Number(amount) || 0,
      reference,
      notes,
    });
  };

  const badgeClass =
    status === 'refunded'
      ? 'bg-green-100 text-green-800'
      : status === 'processing'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-700';

  return (
    <form onSubmit={handleSave} className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-900/40">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100">Refund Tracking</h4>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${badgeClass}`}>
          {status === 'not_applicable' ? 'N/A' : status}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
          >
            <option value="none">No refund needed</option>
            <option value="wallet">Wallet credit</option>
            <option value="source">Source account (bank/card)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
          >
            <option value="not_applicable">Not applicable</option>
            <option value="processing">Processing</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Amount (₹)</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Reference (UTR / Refund ID)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. rfnd_XYZ123"
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal note shown to customer on refund tracker"
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
          />
        </div>
      </div>

      {initial.refundedAt && (
        <p className="text-xs text-gray-500 mt-2">
          Refunded on {new Date(initial.refundedAt).toLocaleString('en-IN')}
        </p>
      )}

      <button
        type="submit"
        className="mt-3 px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
      >
        Save Refund Update
      </button>
    </form>
  );
}
