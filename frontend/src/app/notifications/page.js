'use client';

/**
 * Notifications page
 * --------------------------------------------------------------------------
 * Full-page list with category tabs (Flipkart-style) and time grouping
 * (Today / Yesterday / Earlier). Mark single, mark all, delete, clear all.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiBell, FiCheck, FiPackage, FiCreditCard, FiTag, FiShield, FiAlertCircle,
  FiInfo, FiTrash2, FiArrowLeft,
} from 'react-icons/fi';
import { useAuthStore } from '@/lib/store';
import { notificationsAPI, peekCached } from '@/lib/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'all',      label: 'All',          icon: FiBell },
  { id: 'order',    label: 'Orders',       icon: FiPackage },
  { id: 'wallet',   label: 'Wallet',       icon: FiCreditCard },
  { id: 'offer',    label: 'Offers',       icon: FiTag },
  { id: 'security', label: 'Security',     icon: FiShield },
  { id: 'alert',    label: 'Alerts',       icon: FiAlertCircle },
];

const CATEGORY_META = {
  order:    { icon: FiPackage,     ring: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Order' },
  wallet:   { icon: FiCreditCard,  ring: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',           label: 'Wallet' },
  offer:    { icon: FiTag,         ring: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',                label: 'Offer' },
  security: { icon: FiShield,      ring: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',                label: 'Security' },
  alert:    { icon: FiAlertCircle, ring: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',        label: 'Alert' },
  system:   { icon: FiInfo,        ring: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',                   label: 'System' },
};

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function groupByDay(list) {
  const today = startOfDay(new Date());
  const yesterday = today - 86_400_000;
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  for (const n of list) {
    const day = startOfDay(new Date(n.createdAt));
    if (day === today) groups.Today.push(n);
    else if (day === yesterday) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  }
  return groups;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Cache key used by the SWR layer in `lib/api.js`. Mirrored here so we can
// hydrate state synchronously via `peekCached` on mount.
const cacheKeyFor = (tab) => `notifications:${tab}`;
const hydrateFromCache = (tab) => {
  const v = peekCached(cacheKeyFor(tab));
  if (!v) return null;
  return {
    items: v.notifications || [],
    counts: v.counts || {},
    page: v.page || 1,
    pages: v.pages || 1,
    loaded: true,
  };
};

export default function NotificationsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  // Per-tab in-memory state. Seeded synchronously from the SWR disk cache so
  // revisits paint with zero flicker. The SWR layer revalidates in the
  // background and we patch fresh data in via `onFresh`.
  const [tabState, setTabState] = useState(() => {
    const initial = {};
    for (const t of TABS) {
      const cached = hydrateFromCache(t.id);
      if (cached) initial[t.id] = cached;
    }
    return initial;
  });
  const [loading, setLoading] = useState(() => !hydrateFromCache('all'));
  // AbortController per tab — used to cancel an in-flight request if the user
  // switches tabs again before it completes.
  const abortRef = useRef({});
  // Debounce rapid tab switching so we don't fire a request on every flick.
  const debounceRef = useRef(null);

  const current = tabState[activeTab] || { items: [], counts: {}, page: 1, pages: 1, loaded: false };
  const items = current.items;
  const counts = current.counts;
  const page = current.page;
  const pages = current.pages;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, isLoading, router]);

  // Apply a server response payload to the per-tab cache.
  const applyResponse = useCallback((tab, res, append = false) => {
    const next = res?.notifications || [];
    setTabState((s) => {
      const prev = s[tab] || { items: [] };
      return {
        ...s,
        [tab]: {
          items: append ? [...prev.items, ...next] : next,
          counts: res?.counts || {},
          page: res?.page || 1,
          pages: res?.pages || 1,
          loaded: true,
        },
      };
    });
  }, []);

  /**
   * Fetch a tab's notifications.
   *
   * The api-layer `notificationsAPI.list` uses SWR — it resolves immediately
   * with cached data (if any) and triggers a background revalidation that
   * fires `onFresh(value)` when the server response actually differs.
   *
   * We additionally:
   *  - Cancel any in-flight request for this tab via `AbortController`.
   *  - Skip showing the skeleton when we already have something to render.
   */
  const load = useCallback(async (tab, pg = 1, append = false) => {
    // Cancel any prior request for this tab.
    abortRef.current[tab]?.abort();
    const ctrl = new AbortController();
    abortRef.current[tab] = ctrl;

    const params = { page: pg, limit: 20 };
    if (tab !== 'all') params.category = tab;

    try {
      const res = await notificationsAPI.list(params, {
        signal: ctrl.signal,
        // Background revalidation: only patch when payload actually changed.
        onFresh: (fresh) => {
          if (ctrl.signal.aborted) return;
          applyResponse(tab, fresh, false);
        },
      });
      if (ctrl.signal.aborted) return;
      applyResponse(tab, res, append);
    } catch (err) {
      if (err?.name === 'AbortError') return; // expected on tab switch
      // Silent: keep whatever was last rendered.
    } finally {
      if (abortRef.current[tab] === ctrl) abortRef.current[tab] = null;
      setLoading(false);
    }
  }, [applyResponse]);

  // Tab change → load with a tiny debounce so a fast left-right scrub doesn't
  // queue up a burst of network calls.
  useEffect(() => {
    if (!isAuthenticated) return;
    const hasCached = !!tabState[activeTab]?.loaded;
    if (!hasCached) setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(activeTab, 1, false);
    }, hasCached ? 60 : 0);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated, load]);

  // Cancel any pending request when the page unmounts.
  useEffect(() => () => {
    Object.values(abortRef.current).forEach((c) => c?.abort?.());
  }, []);

  // Apply a mutation to every cached tab so counts/items stay consistent
  // without needing to refetch each tab when the user switches.
  const updateAllTabs = (mutator) => {
    setTabState((s) => {
      const out = {};
      for (const k of Object.keys(s)) out[k] = mutator(s[k], k);
      return out;
    });
  };

  const handleItemClick = async (n) => {
    if (!n.read) {
      try { await notificationsAPI.markRead(n._id); } catch {}
      updateAllTabs((tab) => ({
        ...tab,
        items: tab.items.map((x) => (x._id === n._id ? { ...x, read: true } : x)),
        counts: { ...tab.counts, unread: Math.max(0, (tab.counts?.unread || 1) - 1) },
      }));
    }
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead(activeTab === 'all' ? undefined : activeTab);
      const cat = activeTab === 'all' ? null : activeTab;
      updateAllTabs((tab, key) => {
        // If marking all in a category, only flip items that match.
        const items = tab.items.map((x) =>
          (!cat || x.category === cat) ? { ...x, read: true } : x
        );
        return { ...tab, items, counts: { ...tab.counts, unread: cat ? tab.counts?.unread : 0 } };
      });
      toast.success('All marked as read');
    } catch (e) {
      toast.error('Failed');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsAPI.remove(id);
      updateAllTabs((tab) => ({ ...tab, items: tab.items.filter((x) => x._id !== id) }));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all notifications in this view?')) return;
    try {
      await notificationsAPI.clearAll(activeTab === 'all' ? undefined : activeTab);
      const cat = activeTab === 'all' ? null : activeTab;
      updateAllTabs((tab) => ({
        ...tab,
        items: cat ? tab.items.filter((x) => x.category !== cat) : [],
      }));
      toast.success('Cleared');
    } catch {
      toast.error('Failed');
    }
  };

  const groups = groupByDay(items);
  const unread = counts.unread || 0;

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-6 lg:py-10 max-w-3xl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) router.back();
              else router.push('/profile');
            }}
            className="h-10 w-10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl lg:text-3xl font-semibold text-brand-charcoal dark:text-gray-100 truncate">
              Notifications
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {unread > 0 ? `${unread} unread` : 'You\u2019re all caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs sm:text-sm font-medium text-brand-green dark:text-emerald-300 hover:bg-brand-green/10 dark:hover:bg-emerald-300/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors"
            >
              <FiCheck size={14} /> <span className="hidden sm:inline">Mark all read</span><span className="sm:hidden">Read all</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-16 lg:top-20 z-30 -mx-4 px-4 py-2 bg-brand-cream/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-brand-cream/70 dark:supports-[backdrop-filter]:bg-gray-900/70">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            const cnt = t.id === 'all' ? (counts.all || 0) : (counts[t.id] || 0);
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-charcoal text-white border-brand-charcoal dark:bg-white dark:text-gray-900 dark:border-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon size={13} />
                {t.label}
                {cnt > 0 && (
                  <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white dark:bg-gray-900/15 dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {loading && items.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4">
              <FiBell size={32} className="text-gray-400" />
            </div>
            <p className="font-serif text-lg font-semibold text-brand-charcoal dark:text-gray-100">No notifications</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === 'all' ? 'When something happens, you\u2019ll see it here.' : 'Nothing in this category yet.'}
            </p>
          </div>
        ) : (
          <>
            {['Today', 'Yesterday', 'Earlier'].map((label) => {
              const arr = groups[label];
              if (!arr || arr.length === 0) return null;
              return (
                <section key={label} className="mb-6">
                  <h2 className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-2 px-1">
                    {label}
                  </h2>
                  <div className="space-y-2">
                    {arr.map((n) => {
                      const meta = CATEGORY_META[n.category] || CATEGORY_META.system;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={n._id}
                          onClick={() => handleItemClick(n)}
                          className={`group relative cursor-pointer rounded-2xl border transition-all p-4 flex items-start gap-3 ${
                            n.read
                              ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                              : 'bg-gradient-to-r from-brand-green/[0.06] to-transparent dark:from-emerald-300/[0.06] border-brand-green/30 dark:border-emerald-300/20 hover:from-brand-green/[0.1]'
                          }`}
                        >
                          <span className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.ring}`}>
                            <Icon size={18} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`text-sm sm:text-[15px] leading-snug ${n.read ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-brand-charcoal dark:text-gray-100 font-semibold'}`}>
                                  {n.title}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                  {n.message}
                                </p>
                              </div>
                              {!n.read && (
                                <span className="h-2.5 w-2.5 mt-1.5 rounded-full bg-brand-green dark:bg-emerald-400 flex-shrink-0 ring-2 ring-brand-green/20 dark:ring-emerald-400/20" />
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${meta.ring}`}>
                                  {meta.label}
                                </span>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                  {formatTime(n.createdAt)}
                                </span>
                              </div>
                              <button
                                onClick={(e) => handleDelete(n._id, e)}
                                className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                aria-label="Delete"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {page < pages && (
              <div className="text-center mt-4">
                <button
                  onClick={() => load(activeTab, page + 1, true)}
                  className="text-sm font-medium text-brand-green dark:text-emerald-300 hover:bg-brand-green/10 dark:hover:bg-emerald-300/10 px-4 py-2 rounded-full transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}

            {items.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={handleClearAll}
                  className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 inline-flex items-center gap-1.5"
                >
                  <FiTrash2 size={12} /> Clear all in this view
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
