'use client';

import { useEffect, useState } from 'react';
import { FiSettings, FiSave } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import { AdminTableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-brand-green' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const initialForm = {
    cancellationFeeEnabled: false,
    cancellationFeePercent: 50,
    cancellationFeeCap: 100,
    codEnabled: false,
    unboxingVideoNoticeEnabled: true,
  };
  const [form, setForm] = useState(initialForm);
  const [savedForm, setSavedForm] = useState(initialForm);

  useEffect(() => {
    adminAPI.getSettings()
      .then((data) => {
        const next = {
          cancellationFeeEnabled: !!data.cancellationFeeEnabled,
          cancellationFeePercent: data.cancellationFeePercent ?? 50,
          cancellationFeeCap: data.cancellationFeeCap ?? 100,
          codEnabled: !!data.codEnabled,
          unboxingVideoNoticeEnabled: data.unboxingVideoNoticeEnabled !== false,
        };
        setForm(next);
        setSavedForm(next);
      })
      .catch((err) => toast.error(err.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const isDirty =
    form.cancellationFeeEnabled !== savedForm.cancellationFeeEnabled ||
    Number(form.cancellationFeePercent) !== Number(savedForm.cancellationFeePercent) ||
    Number(form.cancellationFeeCap) !== Number(savedForm.cancellationFeeCap) ||
    form.codEnabled !== savedForm.codEnabled ||
    form.unboxingVideoNoticeEnabled !== savedForm.unboxingVideoNoticeEnabled;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pct = Number(form.cancellationFeePercent);
    const cap = Number(form.cancellationFeeCap);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Percent must be between 0 and 100');
      return;
    }
    if (Number.isNaN(cap) || cap < 0) {
      toast.error('Cap must be a non-negative number');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.updateSettings({
        cancellationFeeEnabled: form.cancellationFeeEnabled,
        cancellationFeePercent: pct,
        cancellationFeeCap: cap,
        codEnabled: form.codEnabled,
        unboxingVideoNoticeEnabled: form.unboxingVideoNoticeEnabled,
      });
      const saved = {
        cancellationFeeEnabled: form.cancellationFeeEnabled,
        cancellationFeePercent: pct,
        cancellationFeeCap: cap,
        codEnabled: form.codEnabled,
        unboxingVideoNoticeEnabled: form.unboxingVideoNoticeEnabled,
      };
      setForm(saved);
      setSavedForm(saved);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminTableSkeleton />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <FiSettings size={24} className="text-brand-green" />
        <h1 className="text-2xl font-bold text-brand-charcoal dark:text-white">Site Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Cash on Delivery */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-brand-charcoal dark:text-white">Cash on Delivery (COD)</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                When disabled, customers cannot select COD at checkout — only online payment is allowed.
              </p>
            </div>
            <Toggle
              checked={form.codEnabled}
              onChange={(v) => setForm({ ...form, codEnabled: v })}
            />
          </div>
          <p className={`text-xs mt-3 font-medium ${form.codEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            Currently: {form.codEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>

        {/* Cancellation Fee */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-brand-charcoal dark:text-white">Order Cancellation Fee</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                When enabled, customers can cancel a shipped order with a fee deducted as below.
                When disabled, shipped orders cannot be cancelled.
              </p>
            </div>
            <Toggle
              checked={form.cancellationFeeEnabled}
              onChange={(v) => setForm({ ...form, cancellationFeeEnabled: v })}
            />
          </div>

          <div className={`mt-5 ${form.cancellationFeeEnabled ? '' : 'opacity-60 pointer-events-none'}`}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Percentage of order total (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.cancellationFeePercent}
                  onChange={(e) => setForm({ ...form, cancellationFeePercent: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">e.g. 50 for 50%</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum fee cap (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.cancellationFeeCap}
                  onChange={(e) => setForm({ ...form, cancellationFeeCap: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">e.g. 100 for ₹100 max</p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-brand-cream/50 dark:bg-gray-900/50 border border-brand-cream dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Preview:</strong> When enabled, {form.cancellationFeePercent || 0}% of the order amount up to ₹{form.cancellationFeeCap || 0}/- will be deducted as a Cancellation fee.
              </p>
            </div>
          </div>
        </div>

        {/* Unboxing Video Notice */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-brand-charcoal dark:text-white">Unboxing Video Notice</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                When enabled, a red-bordered mandatory unboxing video notice is shown at the bottom of the Returns &amp; Exchange section on the Help page.
              </p>
            </div>
            <Toggle
              checked={form.unboxingVideoNoticeEnabled}
              onChange={(v) => setForm({ ...form, unboxingVideoNoticeEnabled: v })}
            />
          </div>
          <p className={`text-xs mt-3 font-medium ${form.unboxingVideoNoticeEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            Currently: {form.unboxingVideoNoticeEnabled ? 'Visible to customers' : 'Hidden'}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !isDirty}
          className="btn-primary text-sm py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#F5F1E9] dark:text-brand-charcoal dark:hover:bg-[#F5F1E9]/90"
        >
          <FiSave size={16} /> {saving ? 'Saving...' : isDirty ? 'Save Settings' : 'Saved'}
        </button>
      </form>
    </div>
  );
}
