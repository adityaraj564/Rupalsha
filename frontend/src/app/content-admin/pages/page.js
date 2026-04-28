'use client';

import { useEffect, useState } from 'react';
import { subAdminAPI } from '@/lib/api';
import { FiEdit2, FiCheck, FiX, FiMail, FiPhone, FiClock, FiGift, FiLink, FiImage, FiPlus, FiTrash2, FiTruck, FiRefreshCw, FiShield, FiHeart, FiStar, FiAward, FiPackage, FiSmile, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PAGE_LABELS = {
  contact: 'Contact Us',
  shipping: 'Shipping Info',
  returns: 'Returns & Exchange',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  'special-offer': 'Special Offer (Home Banner)',
  'home-hero': 'Home — Hero Section',
  'home-features': 'Home — Features Bar',
  'footer-about': 'Footer — Brand Block',
};

const FEATURE_ICON_OPTIONS = [
  'FiTruck', 'FiRefreshCw', 'FiShield', 'FiHeart', 'FiStar', 'FiAward', 'FiPackage', 'FiSmile', 'FiTag', 'FiGift',
];

const FEATURE_ICON_MAP = {
  FiTruck, FiRefreshCw, FiShield, FiHeart, FiStar, FiAward, FiPackage, FiSmile, FiTag, FiGift,
};

export default function ContentAdminPagesPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingOfferImage, setUploadingOfferImage] = useState(false);

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
      heroEyebrow: page.heroEyebrow || '',
      heroTitle: page.heroTitle || '',
      heroAccent: page.heroAccent || '',
      brandName: page.brandName || '',
      features: Array.isArray(page.features) && page.features.length > 0
        ? page.features.map((f) => ({ icon: f.icon || 'FiTruck', title: f.title || '', desc: f.desc || '' }))
        : [],
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
      <p className="text-gray-500 text-sm mb-6">Edit home page sections (hero, features, special offer), footer brand block, contact details, and policy pages.</p>

      {/* Editor */}
      {editingKey && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
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
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><FiImage size={14} /> Background Image</label>
                  <div className="flex items-start gap-3">
                    {form.offerImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.offerImage} alt="offer" className="w-24 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                        <FiImage size={14} />
                        {uploadingOfferImage ? 'Uploading…' : 'Upload image'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingOfferImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file) return;
                            setUploadingOfferImage(true);
                            try {
                              const fd = new FormData();
                              fd.append('image', file);
                              const res = await subAdminAPI.uploadContentImage(fd);
                              setForm((f) => ({ ...f, offerImage: res.url }));
                              toast.success('Image uploaded');
                            } catch (err) {
                              toast.error(err.message || 'Upload failed');
                            } finally {
                              setUploadingOfferImage(false);
                            }
                          }}
                        />
                      </label>
                      {form.offerImage && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, offerImage: '' })}
                          className="ml-2 text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                      <input type="text" value={form.offerImage} onChange={(e) => setForm({ ...form, offerImage: e.target.value })} placeholder="Or paste an image URL…" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs" />
                    </div>
                  </div>
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
            {editingKey === 'home-hero' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Eyebrow text (small uppercase line)</label>
                  <input type="text" value={form.heroEyebrow} onChange={(e) => setForm({ ...form, heroEyebrow: e.target.value })} placeholder="Exquisite Jewellery Collection" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Headline first line</label>
                  <input type="text" value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} placeholder="Adorn Your" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Headline accent (gold italic)</label>
                  <input type="text" value={form.heroAccent} onChange={(e) => setForm({ ...form, heroAccent: e.target.value })} placeholder="Elegance" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                </div>
                <p className="md:col-span-2 text-xs text-gray-500">The main paragraph below the headline is edited in the “Content” field above. Font, size and colour come from the site theme and will not change when you edit the text.</p>
              </div>
            )}
            {editingKey === 'footer-about' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="block text-sm font-medium mb-1">Brand name (footer heading)</label>
                <input type="text" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} placeholder="RUPALSHA" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                <p className="text-xs text-gray-500 mt-2">The tagline paragraph below the brand name is edited in the “Content” field above.</p>
              </div>
            )}
            {editingKey === 'home-features' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Feature items shown on the home page</p>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, features: [...(form.features || []), { icon: 'FiTruck', title: '', desc: '' }] })}
                    className="inline-flex items-center gap-1 text-sm text-brand-gold hover:underline"
                  >
                    <FiPlus size={14} /> Add feature
                  </button>
                </div>
                <div className="space-y-3">
                {(form.features || []).map((f, i) => {
                  const SelectedIcon = FEATURE_ICON_MAP[f.icon] || FiTruck;
                  return (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="md:col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">Icon</label>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-9 h-9 rounded-full bg-brand-cream flex items-center justify-center flex-shrink-0">
                            <SelectedIcon className="text-brand-green" size={16} />
                          </div>
                          <span className="text-xs text-gray-500 truncate">{f.icon}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
                          {FEATURE_ICON_OPTIONS.map((opt) => {
                            const OptIcon = FEATURE_ICON_MAP[opt] || FiTruck;
                            const selected = opt === f.icon;
                            return (
                              <button
                                key={opt}
                                type="button"
                                title={opt}
                                onClick={() => {
                                  const next = [...form.features];
                                  next[i] = { ...next[i], icon: opt };
                                  setForm({ ...form, features: next });
                                }}
                                className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${
                                  selected
                                    ? 'bg-brand-gold/20 text-brand-gold ring-1 ring-brand-gold'
                                    : 'text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-brand-green'
                                }`}
                              >
                                <OptIcon size={14} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-xs text-gray-500 mb-1">Title</label>
                        <input
                          type="text"
                          value={f.title}
                          onChange={(e) => {
                            const next = [...form.features];
                            next[i] = { ...next[i], title: e.target.value };
                            setForm({ ...form, features: next });
                          }}
                          placeholder="Faster Delivery"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <input
                          type="text"
                          value={f.desc}
                          onChange={(e) => {
                            const next = [...form.features];
                            next[i] = { ...next[i], desc: e.target.value };
                            setForm({ ...form, features: next });
                          }}
                          placeholder="Quick & reliable shipping"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                        />
                      </div>
                      <div className="md:col-span-1 flex md:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...form.features];
                            next.splice(i, 1);
                            setForm({ ...form, features: next });
                          }}
                          className="mt-5 h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Remove"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                  {(form.features || []).length === 0 && (
                    <p className="text-xs text-gray-500">No features yet. Click “Add feature” to create one.</p>
                  )}
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
        <LivePreview pageKey={editingKey} form={form} />
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
              {page.pageKey === 'home-hero' && (
                <p className="text-xs text-gray-400 mt-1">{page.heroTitle} <em>{page.heroAccent}</em></p>
              )}
              {page.pageKey === 'home-features' && (
                <p className="text-xs text-gray-400 mt-1">{(page.features || []).length} feature(s)</p>
              )}
              {page.pageKey === 'footer-about' && (
                <p className="text-xs text-gray-400 mt-1">{page.brandName}</p>
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

// ──────────────────────────────────────────────────────────────────────────
// Live preview pane — renders a scaled-down approximation of how the
// edited section looks on the live site. Pure presentational component;
// no network, no global state. Cheap to re-render on every keystroke.
// ──────────────────────────────────────────────────────────────────────────
function LivePreview({ pageKey, form }) {
  const visualKeys = ['home-hero', 'home-features', 'special-offer', 'footer-about'];
  const isVisual = visualKeys.includes(pageKey);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden xl:sticky xl:top-4 self-start">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100">Live Preview</h3>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">Updates as you type</span>
      </div>
      <div className="p-4 max-h-[80vh] overflow-y-auto">
        {pageKey === 'home-hero' && (
          <div className="relative rounded-xl overflow-hidden bg-brand-cream dark:bg-gray-950 p-6 md:p-8">
            <p className="text-brand-gold font-medium tracking-[0.3em] uppercase text-[10px] md:text-xs mb-3">
              {form.heroEyebrow || 'Exquisite Jewellery Collection'}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100 leading-tight mb-4">
              {form.heroTitle || 'Adorn Your'}
              <br />
              <span className="text-brand-gold italic">{form.heroAccent || 'Elegance'}</span>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md leading-relaxed whitespace-pre-line">
              {form.content || 'Discover handcrafted jewellery that tells your story. From timeless classics to modern masterpieces — crafted with love.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="bg-brand-green text-white text-xs px-4 py-2 rounded-full">Shop Now →</span>
              <span className="border border-brand-charcoal/30 text-brand-charcoal dark:text-gray-200 text-xs px-4 py-2 rounded-full">View Collections</span>
            </div>
          </div>
        )}

        {pageKey === 'home-features' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
            {(form.features || []).length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No features yet. Click “Add feature” to see them here.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {(form.features || []).map((f, i) => {
                  const Icon = FEATURE_ICON_MAP[f.icon] || FiTruck;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center flex-shrink-0">
                        <Icon className="text-brand-green" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-brand-charcoal dark:text-gray-200 truncate">{f.title || 'Title'}</p>
                        <p className="text-xs text-gray-400 truncate">{f.desc || 'Description'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {pageKey === 'special-offer' && (
          <div className="relative rounded-2xl overflow-hidden bg-brand-green p-6">
            <p className="text-brand-gold text-[10px] font-medium tracking-widest uppercase mb-3">{form.title || 'Special Offer'}</p>
            <h2 className="font-serif text-2xl md:text-3xl text-white font-bold leading-tight mb-3">
              {form.offerHeading || 'Get 10% Off Your First Order'}
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Use code <span className="font-semibold text-brand-gold">{form.offerCode || 'RUP10'}</span> {form.offerDescription || 'at checkout'}.{' '}
              {form.content || 'Valid on all products.'}
            </p>
            <span className="bg-brand-gold text-white text-xs px-4 py-2 rounded-full inline-block">Shop Now →</span>
          </div>
        )}

        {pageKey === 'footer-about' && (
          <div className="bg-brand-green text-white rounded-xl p-6">
            <h2 className="font-serif text-2xl font-bold text-white mb-3">{form.brandName || 'RUPALSHA'}</h2>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {form.content || 'Adorn Your Elegance. Discover handcrafted jewellery that tells your story — from timeless classics to modern masterpieces.'}
            </p>
          </div>
        )}

        {!isVisual && (
          <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-serif text-xl font-semibold text-brand-charcoal dark:text-gray-100 mb-3">
              {form.title || 'Page title'}
            </h3>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300"
              // Content is HTML supplied by trusted admins only.
              dangerouslySetInnerHTML={{ __html: form.content || '<p class="text-gray-400">Start typing in the Content field to see a preview.</p>' }}
            />
            {pageKey === 'contact' && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 space-y-1">
                {form.contactEmail && <p>📧 {form.contactEmail}</p>}
                {form.contactPhone && <p>📞 {form.contactPhone}</p>}
                {form.supportHours && <p>🕒 {form.supportHours}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

