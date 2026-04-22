'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiSearch, FiX, FiImage, FiStar, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';

const EMPTY_BLOG = {
  title: '',
  slug: '',
  shortDescription: '',
  content: '',
  category: 'General',
  tags: '',
  author: 'Rupalsha',
  status: 'published',
  isFeatured: false,
  sortOrder: 0,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
};

const CATEGORIES = ['General', 'Jewellery Guide', 'Jewellery Care', 'Style Guide', 'Trends', 'Shopping Guide'];

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [form, setForm] = useState(EMPTY_BLOG);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await adminAPI.getBlogs(params);
      setBlogs(data.blogs || []);
    } catch (err) {
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [search, statusFilter]);

  const openCreate = () => {
    setEditingBlog(null);
    setForm(EMPTY_BLOG);
    setImageFile(null);
    setImagePreview('');
    setShowEditor(true);
  };

  const openEdit = async (blog) => {
    try {
      const data = await adminAPI.getBlog(blog._id);
      const b = data.blog;
      setEditingBlog(b);
      setForm({
        title: b.title || '',
        slug: b.slug || '',
        shortDescription: b.shortDescription || '',
        content: b.content || '',
        category: b.category || 'General',
        tags: b.tags?.join(', ') || '',
        author: b.author || 'Rupalsha',
        status: b.status || 'published',
        isFeatured: b.isFeatured || false,
        sortOrder: b.sortOrder || 0,
        metaTitle: b.metaTitle || '',
        metaDescription: b.metaDescription || '',
        metaKeywords: b.metaKeywords || '',
      });
      setImageFile(null);
      setImagePreview(b.featuredImage?.url || '');
      setShowEditor(true);
    } catch {
      toast.error('Failed to load blog');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.shortDescription.trim()) return toast.error('Short description is required');
    if (!form.content.trim()) return toast.error('Content is required');

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'isFeatured') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, value);
        }
      });
      if (imageFile) formData.append('featuredImage', imageFile);

      if (editingBlog) {
        await adminAPI.updateBlog(editingBlog._id, formData);
        toast.success('Blog updated');
      } else {
        await adminAPI.createBlog(formData);
        toast.success('Blog created');
      }

      setShowEditor(false);
      fetchBlogs();
    } catch (err) {
      toast.error(err.message || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (blog) => {
    try {
      const data = await adminAPI.toggleBlogStatus(blog._id);
      toast.success(data.message);
      fetchBlogs();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (blog) => {
    if (!confirm(`Delete "${blog.title}"? This cannot be undone.`)) return;
    setDeleting(blog._id);
    try {
      await adminAPI.deleteBlog(blog._id);
      toast.success('Blog deleted');
      fetchBlogs();
    } catch {
      toast.error('Failed to delete blog');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  // ── Editor View ──
  if (showEditor) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-serif font-bold">{editingBlog ? 'Edit Blog' : 'New Blog Post'}</h1>
          <button onClick={() => setShowEditor(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left 2/3 */}
            <div className="lg:col-span-2 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-gold/50 focus:outline-none"
                  placeholder="Enter blog title"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-gold/50 focus:outline-none text-sm"
                  placeholder="auto-generated-from-title (or enter custom)"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to auto-generate from title</p>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Short Description *</label>
                <textarea
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-gold/50 focus:outline-none resize-none"
                  placeholder="Brief summary shown on blog cards (max 500 chars)"
                />
                <p className="text-xs text-gray-400 mt-1">{form.shortDescription.length}/500</p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Content * (HTML supported)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={18}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-gold/50 focus:outline-none resize-y font-mono text-sm"
                  placeholder="<h2>Your heading</h2>&#10;<p>Your paragraph...</p>&#10;<ul><li>Bullet point</li></ul>"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use HTML tags: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;img&gt;, etc.
                </p>
              </div>
            </div>

            {/* Sidebar - Right 1/3 */}
            <div className="space-y-5">
              {/* Featured Image */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <label className="block text-sm font-medium mb-1">Featured Image</label>
                <p className="text-xs text-gray-400 mb-3">Recommended: 1200 × 675 px (16:9 ratio)</p>
                {imagePreview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="300px" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(''); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-brand-gold hover:text-brand-gold transition-colors"
                  >
                    <FiImage size={24} />
                    <span className="text-sm">Upload Image</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {imagePreview && (
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-brand-green hover:underline">
                    Change Image
                  </button>
                )}
              </div>

              {/* Status & Category */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Tags</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Author</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Featured</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isFeatured: !form.isFeatured })}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                      form.isFeatured ? 'bg-brand-gold' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isFeatured ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    min="0"
                  />
                </div>
              </div>

              {/* SEO */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SEO Settings</h3>
                <div>
                  <label className="block text-xs font-medium mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={form.metaTitle}
                    onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    maxLength={120}
                    placeholder="SEO title (max 120 chars)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Meta Description</label>
                  <textarea
                    value={form.metaDescription}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                    rows={3}
                    maxLength={320}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none"
                    placeholder="SEO description (max 320 chars)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Meta Keywords</label>
                  <input
                    type="text"
                    value={form.metaKeywords}
                    onChange={(e) => setForm({ ...form, metaKeywords: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    placeholder="keyword1, keyword2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingBlog ? 'Update Blog' : 'Create Blog'}
            </button>
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Blog Posts</h1>
          <p className="text-sm text-gray-500 mt-1">{blogs.length} article{blogs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
          <FiPlus size={18} /> New Blog Post
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blogs..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      {/* Blog List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse flex gap-4">
              <div className="w-24 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
          <p className="text-gray-500 mb-4">No blog posts found.</p>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <FiPlus size={18} /> Create First Blog
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {blogs.map((blog) => (
            <div
              key={blog._id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-4 hover:shadow-sm transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative w-full sm:w-32 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                {blog.featuredImage?.url ? (
                  <Image src={blog.featuredImage.url} alt={blog.title} fill className="object-cover" sizes="128px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FiImage size={24} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-brand-charcoal dark:text-gray-100 truncate">{blog.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        blog.status === 'published'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {blog.status}
                      </span>
                      <span>{blog.category}</span>
                      <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                      {blog.isFeatured && (
                        <span className="flex items-center gap-0.5 text-brand-gold"><FiStar size={12} /> Featured</span>
                      )}
                      {blog.views > 0 && (
                        <span className="flex items-center gap-0.5"><FiEye size={12} /> {blog.views}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={`/blog/${blog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-brand-green transition-colors"
                      title="View blog"
                    >
                      <FiExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleToggle(blog)}
                      className="p-2 text-gray-400 hover:text-brand-green transition-colors"
                      title={blog.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      {blog.status === 'published' ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                    <button
                      onClick={() => openEdit(blog)}
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Edit"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(blog)}
                      disabled={deleting === blog._id}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{blog.shortDescription}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
