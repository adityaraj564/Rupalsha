'use client';

import { useEffect, useState } from 'react';
import { subAdminAPI } from '@/lib/api';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CATEGORIES = ['General', 'Orders', 'Shipping', 'Returns', 'Payment', 'Products'];

const EMPTY_FAQ = { question: '', answer: '', category: 'General', sortOrder: 0, isActive: true };

export default function ContentAdminFAQsPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FAQ);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchFAQs(); }, []);

  const fetchFAQs = async () => {
    try {
      const data = await subAdminAPI.getFAQs();
      setFaqs(data.faqs || []);
    } catch { toast.error('Failed to load FAQs'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FAQ);
    setShowForm(true);
  };

  const openEdit = (faq) => {
    setEditingId(faq._id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'General',
      sortOrder: faq.sortOrder || 0,
      isActive: faq.isActive !== false,
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) return toast.error('Question and answer are required');
    setSaving(true);
    try {
      if (editingId) {
        await subAdminAPI.updateFAQ(editingId, form);
        toast.success('FAQ updated');
      } else {
        await subAdminAPI.createFAQ(form);
        toast.success('FAQ created');
      }
      setShowForm(false);
      setEditingId(null);
      await fetchFAQs();
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await subAdminAPI.deleteFAQ(id);
      await fetchFAQs();
      toast.success('FAQ deleted');
    } catch (err) { toast.error(err.message || 'Failed to delete'); }
  };

  const toggleActive = async (faq) => {
    try {
      await subAdminAPI.updateFAQ(faq._id, { ...faq, isActive: !faq.isActive });
      await fetchFAQs();
    } catch (err) { toast.error(err.message || 'Failed to update'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">FAQ Management</h1>
        <button onClick={openCreate} className="bg-brand-gold text-white px-4 py-2 rounded-lg hover:bg-brand-gold/90 transition-colors flex items-center gap-2 text-sm">
          <FiPlus size={16} /> Add FAQ
        </button>
      </div>

      {/* Editor Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-4">
            {editingId ? 'Edit FAQ' : 'New FAQ'}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Question *</label>
              <input type="text" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Answer *</label>
              <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" required />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="bg-brand-gold text-white px-6 py-2 rounded-lg hover:bg-brand-gold/90 text-sm disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Update FAQ' : 'Create FAQ'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAQ List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500">{faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}</p>
        </div>
        {faqs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No FAQs yet. Click &quot;Add FAQ&quot; to create one.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {faqs.map((faq) => (
              <div key={faq._id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${faq.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{faq.category}</span>
                    </div>
                    <p className="font-medium text-brand-charcoal dark:text-gray-100">{faq.question}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(faq)} className="p-2 text-gray-400 hover:text-brand-gold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"><FiEdit2 size={16} /></button>
                    <button onClick={() => handleDelete(faq._id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><FiTrash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
