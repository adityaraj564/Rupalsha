'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { FiActivity, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SECTION_COLORS = {
  banner: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  faq: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  page: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  blog: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  about: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

const ACTION_ICONS = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  toggle: '🔄',
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterSection, setFilterSection] = useState('');
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => { fetchLogs(); }, [page, filterSection, filterAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (filterSection) params.section = filterSection;
      if (filterAction) params.action = filterAction;
      const data = await adminAPI.getActivityLog(params);
      setLogs(data.logs || []);
      setTotalPages(data.pages || 1);
    } catch { toast.error('Failed to load activity log'); }
    finally { setLoading(false); }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal dark:text-gray-100 flex items-center gap-2">
            <FiActivity className="text-brand-gold" /> Activity Log
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track all content admin modifications (auto-deleted after 90 days)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FiFilter size={14} /> Filters:
        </div>
        <select
          value={filterSection}
          onChange={(e) => { setFilterSection(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
        >
          <option value="">All Sections</option>
          <option value="banner">Banner</option>
          <option value="faq">FAQ</option>
          <option value="page">Page Content</option>
          <option value="blog">Blog</option>
          <option value="about">About</option>
        </select>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="toggle">Toggle</option>
        </select>
      </div>

      {/* Log List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiActivity size={48} className="mx-auto mb-4 opacity-30" />
          <p>No activity logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm px-5 py-4 flex items-start gap-4">
              <div className="text-xl mt-0.5">{ACTION_ICONS[log.action] || '📝'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-100">{log.description}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SECTION_COLORS[log.section] || 'bg-gray-100 text-gray-600'}`}>
                    {log.section}
                  </span>
                  <span className="text-xs text-gray-400">by {log.userName}</span>
                  <span className="text-xs text-gray-400">{formatTime(log.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FiChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
