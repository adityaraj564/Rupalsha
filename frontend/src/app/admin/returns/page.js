'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FiCheck, FiX, FiVideo, FiExternalLink } from 'react-icons/fi';
import { returnsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'pickup_scheduled', label: 'Pickup scheduled' },
  { value: 'picked_up', label: 'Picked up' },
  { value: 'received', label: 'Received at warehouse' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'rejected', label: 'Rejected' },
];

const REASON_LABELS = {
  wrong_item: 'Wrong item received',
  damaged: 'Damaged / defective',
  missing_parts: 'Missing parts',
  size_issue: 'Size issue',
  different_from_description: 'Different from description',
};

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  pickup_scheduled: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-purple-100 text-purple-800',
  received: 'bg-green-100 text-green-800',
  refunded: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AdminReturnsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { returns } = await returnsAPI.listAll(statusFilter ? { status: statusFilter } : {});
      setList(returns);
    } catch (err) {
      toast.error(err.message || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-bold">Return Requests</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500">No return requests found.</p>
      ) : (
        <div className="overflow-x-auto border rounded-xl dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-3">Return #</th>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Raised</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id} className="border-t dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono text-xs">{r.returnNumber}</td>
                  <td className="p-3">{r.order?.orderNumber || '—'}</td>
                  <td className="p-3">
                    <div>{r.user?.name}</div>
                    <div className="text-xs text-gray-500">{r.user?.email}</div>
                  </td>
                  <td className="p-3">{REASON_LABELS[r.reason] || r.reason}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_OPTIONS.find((s) => s.value === r.status)?.label || r.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-3">
                    <button
                      className="text-brand-green hover:underline text-xs font-medium"
                      onClick={() => setSelected(r)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ReturnDetailModal
          returnId={selected._id}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ReturnDetailModal({ returnId, onClose, onUpdated }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    returnsAPI.getById(returnId).then(({ return: rr }) => {
      setData(rr);
      setStatus(rr.status);
      setPickupDate(rr.pickupDate ? rr.pickupDate.slice(0, 10) : '');
      setTrackingNumber(rr.trackingNumber || '');
      setCourierName(rr.courierName || '');
      setAdminNote(rr.adminNote || '');
      setRejectionReason(rr.rejectionReason || '');
      setRefundAmount(rr.refundAmount || '');
    });
  }, [returnId]);

  const save = async () => {
    setSaving(true);
    try {
      await returnsAPI.updateStatus(returnId, {
        status,
        pickupDate: pickupDate || null,
        trackingNumber,
        courierName,
        adminNote,
        rejectionReason: status === 'rejected' ? rejectionReason : '',
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
      });
      toast.success('Return updated');
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl my-8 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800">
          <div>
            <h2 className="font-serif text-xl font-semibold">Return {data.returnNumber}</h2>
            <p className="text-xs text-gray-500">
              Order {data.order?.orderNumber} • {data.user?.name} ({data.user?.email})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <FiX size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-sm"><span className="font-medium">Reason:</span> {REASON_LABELS[data.reason] || data.reason}</p>
            {data.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{data.description}</p>}
          </div>

          {/* Evidence */}
          <div>
            <p className="text-sm font-medium mb-2">Customer evidence</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.images?.map((img) => (
                <a
                  key={img.public_id}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-lg overflow-hidden border dark:border-gray-700 relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="evidence" className="w-full h-full object-cover" />
                </a>
              ))}
              {data.video?.url && (
                <a
                  href={data.video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg border dark:border-gray-700 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiVideo size={28} className="text-brand-green" />
                  <span className="text-xs mt-2">Video ({data.video.duration || 0}s)</span>
                  <FiExternalLink size={12} className="mt-1 text-gray-400" />
                </a>
              )}
            </div>
          </div>

          {/* Status + fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pickup date</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Courier name</label>
              <input
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="Delhivery, Bluedart, etc."
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tracking number</label>
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Admin note (visible on timeline)</label>
              <input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
              />
            </div>
            {status === 'rejected' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Rejection reason (shown to customer)</label>
                <input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>
            )}
            {status === 'refunded' && (
              <div>
                <label className="block text-xs font-medium mb-1">Refund amount (₹)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border dark:border-gray-700 text-sm">Close</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
