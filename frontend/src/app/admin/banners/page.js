'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { adminAPI } from '@/lib/api';
import { AdminTableSkeleton } from '@/components/Skeleton';
import { FiPlus, FiTrash2, FiUpload, FiToggleLeft, FiToggleRight, FiArrowUp, FiArrowDown } from 'react-icons/fi';

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const data = await adminAPI.getBanners();
      setBanners(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (newTitle) formData.append('title', newTitle);
      if (newLink) formData.append('link', newLink);

      await adminAPI.createBanner(formData);
      setNewTitle('');
      setNewLink('');
      fileRef.current.value = '';
      await fetchBanners();
      showMessage('Banner added successfully');
    } catch (err) {
      showMessage(err.message || 'Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await adminAPI.deleteBanner(id);
      await fetchBanners();
      showMessage('Banner deleted');
    } catch (err) {
      showMessage(err.message || 'Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await adminAPI.updateBanner(banner._id, { ...banner, isActive: !banner.isActive });
      await fetchBanners();
    } catch (err) {
      showMessage(err.message || 'Failed to update banner');
    }
  };

  const handleMove = async (index, direction) => {
    const newBanners = [...banners];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newBanners.length) return;
    [newBanners[index], newBanners[swapIndex]] = [newBanners[swapIndex], newBanners[index]];
    setBanners(newBanners);
    try {
      await adminAPI.reorderBanners(newBanners.map((b) => b._id));
    } catch (err) {
      showMessage(err.message || 'Failed to reorder');
      await fetchBanners();
    }
  };

  if (loading) return <AdminTableSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">Banner Management</h1>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
          {message}
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-4">Add New Banner</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Recommended size: 1920 × 600 px (landscape). Images will be displayed full-width on the home page.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image *</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-green file:text-white file:cursor-pointer cursor-pointer dark:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title (optional)</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Banner title"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link (optional)</label>
            <input
              type="text"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="/products or https://..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FiUpload size={16} />
              Upload Banner
            </>
          )}
        </button>
      </div>

      {/* Banners List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-brand-charcoal dark:text-gray-100">
            Active Banners ({banners.filter((b) => b.isActive).length} / {banners.length})
          </h2>
        </div>

        {banners.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FiPlus className="mx-auto mb-3" size={32} />
            <p>No banners yet. Upload your first banner above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {banners.map((banner, index) => (
              <div key={banner._id} className="flex items-center gap-4 p-4">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-500 dark:text-gray-400"
                  >
                    <FiArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(index, 1)}
                    disabled={index === banners.length - 1}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-500 dark:text-gray-400"
                  >
                    <FiArrowDown size={14} />
                  </button>
                </div>

                {/* Image Preview */}
                <div className="relative w-40 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                  <Image
                    src={banner.image?.url}
                    alt={banner.title || 'Banner'}
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brand-charcoal dark:text-gray-100 truncate">
                    {banner.title || 'Untitled Banner'}
                  </p>
                  {banner.link && (
                    <p className="text-xs text-gray-400 truncate">{banner.link}</p>
                  )}
                </div>

                {/* Toggle Active */}
                <button
                  onClick={() => handleToggleActive(banner)}
                  className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full ${
                    banner.isActive
                      ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                  }`}
                >
                  {banner.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                  {banner.isActive ? 'Active' : 'Hidden'}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(banner._id)}
                  className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
