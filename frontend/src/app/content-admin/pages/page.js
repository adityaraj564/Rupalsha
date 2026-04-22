'use client';

import { useEffect, useState } from 'react';
import { subAdminAPI } from '@/lib/api';
import { FiEdit2, FiCheck, FiX, FiMail, FiPhone, FiClock, FiGift, FiLink, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PAGE_LABELS = {
  contact: 'Contact Us',
  shipping: 'Shipping Info',
  returns: 'Returns & Exchange',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  'special-offer': 'Special Offer',
};

export default function ContentAdminPagesPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    try {
      const data = await subAdminAPI.getPages();
      setPages(data.pages || []);
    } catch { toast.error('Failed to load pages'); }
    finally { setLoading(false); }
  };

  const openEdit = (page) => {
    setEditingKey(page.pageKey);
    setForm({
      title: page.title || '',
      content: page.content || '',
      contactEmail: page.contactEmail || '',
      contactPhone: page.contactPhone || '',
      supportHours: page.supportHours || '',
      offerHeading: page.offerHeading || '',
      offerCode: page.offerCode || '',
      offerDescription: page.offerDescription || '',
      offerLink: page.offerLink || '',
      offerImage: page.offerImage || '',
    });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return toast.error('Title and content are required');
    setSaving(true);
    try {
      await subAdminAPI.updatePage(editingKey, form);
      toast.success('Page updated');
      setEditingKey(null);
      await fetchPages();
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-charcoal dark:text-gray-100 mb-2">Page Content Management</h1>
      <p className="text-gray-500 text-sm mb-6">Edit content for Contact Us, Shipping Info, Returns & Exchange, and policy pages</p>

      {/* Editor */}
      {editingKey && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-4">
            Edit: {PAGE_LABELS[editingKey] || editingKey}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content (HTML supported)</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono" />
            </div>
            {editingKey === 'special-offer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiGift size={14} /> Offer Heading</label>
                  <input type="text" value={form.offerHeading} onChange={(e) => setForm({ ...form, offerHeading: e.target.value })} placeholder="e.g. Get 10% Off Your First Order" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiGift size={14} /> Offer Code</label>
                  <input type="text" value={form.offerCode} onChange={(e) => setForm({ ...form, offerCode: e.target.value })} placeholder="e.g. RUP10" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiGift size={14} /> Offer Description</label>
                  <input type="text" value={form.offerDescription} onChange={(e) => setForm({ ...form, offerDescription: e.target.value })} placeholder="e.g. at checkout" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiLink size={14} /> CTA Link</label>
                  <input type="text" value={form.offerLink} onChange={(e) => setForm({ ...form, offerLink: e.target.value })} placeholder="e.g. /products" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiImage size={14} /> Background Image URL</label>
                  <input type="text" value={form.offerImage} onChange={(e) => setForm({ ...form, offerImage: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
              </div>
            )}
            {editingKey === 'contact' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiMail size={14} /> Email</label>
                  <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiPhone size={14} /> Phone</label>
                  <input type="text" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiClock size={14} /> Support Hours</label>
                  <input type="text" value={form.supportHours} onChange={(e) => setForm({ ...form, supportHours: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="bg-brand-gold text-white px-6 py-2 rounded-lg hover:bg-brand-gold/90 text-sm disabled:opacity-50 flex items-center gap-2">
                <FiCheck size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingKey(null)} className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <FiX size={16} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pages List */}
      <div className="grid gap-4">
        {pages.map((page) => (
          <div key={page.pageKey} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-brand-charcoal dark:text-gray-100">{PAGE_LABELS[page.pageKey] || page.pageKey}</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{page.title}</p>
              {page.pageKey === 'contact' && page.contactEmail && (
                <p className="text-xs text-gray-400 mt-1">{page.contactEmail} | {page.contactPhone}</p>
              )}
              {page.pageKey === 'special-offer' && page.offerCode && (
                <p className="text-xs text-gray-400 mt-1">Code: {page.offerCode} | {page.offerHeading}</p>
              )}
            </div>
            <button onClick={() => openEdit(page)} className="p-2 text-gray-400 hover:text-brand-gold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-1 text-sm">
              <FiEdit2 size={16} /> Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
