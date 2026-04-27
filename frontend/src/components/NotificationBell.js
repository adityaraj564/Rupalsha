'use client';

/**
 * NotificationBell
 * --------------------------------------------------------------------------
 * Header bell with unread badge + a polished dropdown panel.
 *  - Polls /notifications/unread-count every 60s while authenticated.
 *  - Dropdown lazy-fetches latest notifications when opened.
 *  - Each item is clickable: marks-as-read and routes to its `link`.
 *  - "Mark all as read" and "View all" actions.
 *
 * On mobile (<sm), the dropdown becomes a bottom-anchored sheet for legibility.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiBell, FiCheck, FiPackage, FiCreditCard, FiTag, FiShield, FiAlertCircle, FiInfo, FiX,
} from 'react-icons/fi';
import { useAuthStore } from '@/lib/store';
import { notificationsAPI } from '@/lib/api';

const POLL_MS = 60_000;
const UNREAD_CACHE_KEY = 'rupalsha_unread_count';

const readCachedUnread = () => {
  if (typeof window === 'undefined') return 0;
  const v = parseInt(localStorage.getItem(UNREAD_CACHE_KEY) || '0', 10);
  return Number.isFinite(v) && v >= 0 ? v : 0;
};
const writeCachedUnread = (n) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(UNREAD_CACHE_KEY, String(n || 0)); } catch {}
};

// Map category → icon + accent classes
const CATEGORY_META = {
  order:    { icon: FiPackage,     ring: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  wallet:   { icon: FiCreditCard,  ring: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  offer:    { icon: FiTag,         ring: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  security: { icon: FiShield,      ring: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  alert:    { icon: FiAlertCircle, ring: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  system:   { icon: FiInfo,        ring: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
};

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.max(0, Date.now() - d.getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Hydrate from cache so the badge appears instantly on refresh, before
  // the network round-trip finishes.
  const [unread, setUnread] = useState(() => readCachedUnread());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef(null);
  const btnRef = useRef(null);

  // Don't render for admins/subadmins — they have their own dashboards.
  const visible = isAuthenticated && user && user.role !== 'admin' && user.role !== 'subadmin';

  const fetchUnread = useCallback(async () => {
    if (!visible) return;
    try {
      const { unreadCount } = await notificationsAPI.unreadCount();
      const n = unreadCount || 0;
      setUnread(n);
      writeCachedUnread(n);
    } catch {}
  }, [visible]);

  const fetchList = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const { notifications, unreadCount } = await notificationsAPI.list({ limit: 8 });
      setItems(notifications || []);
      const n = unreadCount || 0;
      setUnread(n);
      writeCachedUnread(n);
    } catch {} finally {
      setLoading(false);
    }
  }, [visible]);

  // Poll unread count while authenticated
  useEffect(() => {
    if (!visible) {
      setUnread(0);
      writeCachedUnread(0);
      setItems([]);
      return;
    }
    fetchUnread();
    const id = setInterval(fetchUnread, POLL_MS);
    return () => clearInterval(id);
  }, [visible, fetchUnread]);

  // When opening, refresh list
  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (dropRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!visible) return null;

  const handleItemClick = async (n) => {
    setOpen(false);
    if (!n.read) {
      try { await notificationsAPI.markRead(n._id); } catch {}
      setUnread((u) => {
        const next = Math.max(0, u - 1);
        writeCachedUnread(next);
        return next;
      });
      setItems((arr) => arr.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    }
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    try { await notificationsAPI.markAllRead(); } catch { return; }
    setUnread(0);
    writeCachedUnread(0);
    setItems((arr) => arr.map((x) => ({ ...x, read: true })));
  };

  const badgeText = unread > 99 ? '99+' : String(unread);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="p-2 hover:text-brand-green transition-colors relative"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <FiBell size={20} />
        {unread > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ${unread > 99 ? 'h-4 min-w-[22px]' : 'h-4 w-4'}`}>
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="sm:hidden fixed inset-0 bg-black/40 z-40" />
          <div
            ref={dropRef}
            className="z-50
              fixed inset-x-0 bottom-0 sm:absolute sm:inset-auto sm:bottom-auto sm:right-0 sm:top-12
              sm:w-[380px] sm:max-w-[calc(100vw-1rem)]
              bg-white dark:bg-gray-900
              rounded-t-2xl sm:rounded-2xl
              border border-gray-200 dark:border-gray-700
              shadow-2xl overflow-hidden flex flex-col
              max-h-[80vh] sm:max-h-[520px]
              animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-brand-charcoal dark:text-gray-100">Notifications</span>
                {unread > 0 && (
                  <span className="text-[11px] font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-brand-green dark:text-emerald-300 hover:bg-brand-green/10 dark:hover:bg-emerald-300/10 px-2 py-1 rounded-md transition-colors inline-flex items-center gap-1"
                  >
                    <FiCheck size={12} /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="sm:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
              ) : items.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <FiBell size={24} className="text-gray-400" />
                  </div>
                  <p className="font-medium text-brand-charcoal dark:text-gray-100">You're all caught up</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No notifications yet.</p>
                </div>
              ) : (
                items.map((n) => {
                  const meta = CATEGORY_META[n.category] || CATEGORY_META.system;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={n._id}
                      onClick={() => handleItemClick(n)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                        n.read
                          ? 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                          : 'bg-brand-green/[0.04] dark:bg-emerald-300/[0.04] hover:bg-brand-green/[0.08] dark:hover:bg-emerald-300/[0.08]'
                      }`}
                    >
                      <span className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.ring}`}>
                        <Icon size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${n.read ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-brand-charcoal dark:text-gray-100 font-semibold'}`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="h-2 w-2 mt-1.5 rounded-full bg-brand-green dark:bg-emerald-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center py-3 text-sm font-semibold text-brand-green dark:text-emerald-300 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </>
  );
}
