'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiTag } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'percentage', discountValue: '',
    minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '',
  });

  useEffect(() => {
    adminAPI.getCoupons()
      .then(data => setCoupons(data.coupons))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: form.code,
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        expiresAt: new Date(form.expiresAt).toISOString(),
      };
      if (form.minOrderAmount) payload.minOrderAmount = Number(form.minOrderAmount);
      if (form.maxDiscount) payload.maxDiscount = Number(form.maxDiscount);
      if (form.usageLimit) payload.usageLimit = Number(form.usageLimit);

      const { coupon } = await adminAPI.createCoupon(payload);
      setCoupons([coupon, ...coupons]);
      setShowForm(false);
      setForm({ code: '', description: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '' });
      toast.success('Coupon created');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await adminAPI.deleteCoupon(id);
      setCoupons(coupons.filter(c => c._id !== id));
      toast.success('Coupon deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-charcoal">Coupons ({coupons.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 flex items-center gap-2">
          <FiPlus size={16} /> Create Coupon
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-4">New Coupon</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input-field" required placeholder="RUP10" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="10% off first order" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="input-field">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Value *</label>
              <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="input-field" required min="0" placeholder={form.discountType === 'percentage' ? '10' : '100'} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Order (₹)</label>
              <input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Discount (₹)</label>
              <input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Usage Limit</label>
              <input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expires At *</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="input-field" required />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="btn-primary text-sm py-2">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons List */}
      <div className="space-y-4">
        {coupons.map((coupon) => (
          <div key={coupon._id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center">
                <FiTag className="text-brand-green" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-brand-green">{coupon.code}</span>
                  {!coupon.isActive && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inactive</span>}
                  {new Date(coupon.expiresAt) < new Date() && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Expired</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `₹${coupon.discountValue} off`}
                  {coupon.minOrderAmount ? ` • Min ₹${coupon.minOrderAmount}` : ''}
                  {coupon.maxDiscount ? ` • Max ₹${coupon.maxDiscount}` : ''}
                </p>
                <p className="text-xs text-gray-400">
                  Used: {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''} •
                  Expires: {new Date(coupon.expiresAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
            <button onClick={() => handleDelete(coupon._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
              <FiTrash2 size={18} />
            </button>
          </div>
        ))}

        {coupons.length === 0 && (
          <p className="text-center text-gray-500 py-10">No coupons yet</p>
        )}
      </div>
    </div>
  );
}
