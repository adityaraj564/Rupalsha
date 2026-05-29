'use client';

// /rewards — user-facing dashboard for the loyalty scratch-card system.
//
//   • Pending section: lists post-purchase rewards the user is eligible
//     for right now. Tapping a card opens the same RewardModal the
//     controller uses, so users who accidentally dismissed a popup can
//     come back here to claim it.
//   • History section: timeline of past reveals — credited wins, pending
//     post-purchase credits awaiting delivery, voided rewards (cancelled
//     orders), and better-luck reveals.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiGift, FiClock, FiCheckCircle, FiXCircle, FiPackage, FiRefreshCw,
} from 'react-icons/fi';
import { rewardsAPI } from '@/lib/api';
import { useRequireAuth } from '@/components/RequireAuth';
import RewardModal from '@/components/RewardModal';

// In-memory cache (per tab session) so revisiting /rewards paints
// instantly while a background fetch refreshes the data. Cleared on full
// page reload — that's fine, the dashboard endpoint is fast anyway.
let dashboardCache = null;

const TYPE_COPY = {
  welcome:       { label: 'Welcome reward',  hint: 'Legacy welcome bonus.' },
  post_purchase: { label: 'Order reward',    hint: 'A bonus on top of your order.' },
  comeback:      { label: 'Comeback reward', hint: 'Legacy comeback bonus.' },
};

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
}

// Visual + label for a past reward row based on its credit lifecycle.
function statusBadge(r) {
  if (r.outcome !== 'won') {
    return { icon: FiXCircle, label: 'Better luck next time', cls: 'text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' };
  }
  if (r.creditStatus === 'credited') {
    return { icon: FiCheckCircle, label: 'Credited to wallet', cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300' };
  }
  if (r.creditStatus === 'voided') {
    return { icon: FiXCircle, label: 'Voided (order cancelled)', cls: 'text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300' };
  }
  if (r.creditStatus === 'pending') {
    return { icon: FiClock, label: 'Pending — credits after return window', cls: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300' };
  }
  return { icon: FiCheckCircle, label: 'Credited', cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300' };
}

export default function RewardsPage() {
  const router = useRouter();
  const isAuthed = useRequireAuth();

  const [config, setConfig] = useState(dashboardCache?.config || null);
  const [eligibility, setEligibility] = useState(dashboardCache?.eligibility || { postPurchase: [] });
  const [history, setHistory] = useState(dashboardCache?.history || []);
  const [loading, setLoading] = useState(!dashboardCache);
  const [refreshing, setRefreshing] = useState(false);
  // The reward card currently being scratched in the modal. Local to this
  // page so we don't fight with the global RewardController.
  const [active, setActive] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async () => {
    try {
      const data = await rewardsAPI.dashboard();
      dashboardCache = data;
      if (!mountedRef.current) return;
      setConfig(data.config);
      setEligibility(data.eligibility || { postPurchase: [] });
      setHistory(data.history || []);
    } catch {
      // Swallow — the page renders an inline empty state when there's
      // nothing to show. A toast for a transient fetch failure on a page
      // the user opened deliberately would be more noise than signal.
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    load();
  }, [isAuthed, load]);

  const openOrder = (o) => config && setActive({
    orderId: o.orderId,
    orderNumber: o.orderNumber,
    segments: config.post_purchase,
  });

  const pendingCount = eligibility.postPurchase?.length || 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) router.back();
            else router.push('/profile');
          }}
          aria-label="Go back"
          className="h-10 w-10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <FiArrowLeft size={20} />
        </button>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-charcoal dark:text-white flex-1">
          My Rewards
        </h1>
        <button
          type="button"
          onClick={() => { setRefreshing(true); load(); }}
          disabled={refreshing}
          className="h-10 w-10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          aria-label="Refresh"
        >
          <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Pending */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Ready to claim {pendingCount > 0 && <span className="ml-1 text-blue-600 dark:text-blue-400">({pendingCount})</span>}
        </h2>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : pendingCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
            <FiGift size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No rewards waiting right now. Place an order to unlock your next scratch card.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {eligibility.postPurchase?.map((o) => (
              <PendingCard
                key={o.orderId}
                title="Order reward"
                subtitle={`For order ${o.orderNumber}`}
                onClick={() => openOrder(o)}
              />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          History
        </h2>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your reward history will show up here.
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-[#0f1622]">
            {history.map((r) => {
              const copy = TYPE_COPY[r.type] || { label: r.type };
              const badge = statusBadge(r);
              const Icon = badge.icon;
              const won = r.outcome === 'won';
              return (
                <li key={r._id} className="p-4 flex items-start gap-3">
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${won ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                    <FiGift size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {copy.label}
                      </p>
                      <p className={`text-sm font-bold tabular-nums ${won ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {won ? `+₹${r.amount}` : '—'}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                        <Icon size={11} /> {badge.label}
                      </span>
                      {r.order?.orderNumber && (
                        <Link
                          href={`/orders/${r.order._id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <FiPackage size={11} /> {r.order.orderNumber}
                        </Link>
                      )}
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {fmtDate(r.createdAt)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
          Wallet credits land in <Link href="/wallet" className="underline hover:text-slate-600 dark:hover:text-slate-300">your wallet</Link>.
          Post-purchase rewards credit {config?.rules?.returnWindowDays ?? 7} days after delivery.
        </p>
      </section>

      {/* Local scratch modal — independent of the global RewardController. */}
      {active && (
        <RewardModal
          orderId={active.orderId}
          orderNumber={active.orderNumber}
          returnWindowDays={config?.rules?.returnWindowDays ?? 7}
          onClose={() => {
            setActive(null);
            // Refresh eligibility + history so a fresh reveal shows up
            // immediately and disappears from the pending section.
            load();
          }}
        />
      )}
    </div>
  );
}

function PendingCard({ title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all
                 bg-gradient-to-br from-blue-50 via-white to-amber-50
                 dark:from-blue-900/20 dark:via-[#0f1622] dark:to-amber-900/20
                 border border-blue-100 dark:border-blue-900/40
                 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
    >
      <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-800 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
        <FiGift size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 whitespace-nowrap">
        Scratch ▸
      </span>
    </button>
  );
}
