'use client';

// SpinController — single mount in app/layout.js. Pollers the eligibility
// endpoint after login (and on relevant route changes) and renders the spin
// modal at the right moment. Priority order: welcome → comeback → post_purchase.
//
// Why a controller and not inline triggers?
//   - The welcome / comeback popups must fire across any page the user
//     happens to be on after logging in. Inlining in /signup or /login
//     misses returning users with persisted sessions.
//   - The post-purchase popup auto-fires when the user lands on the
//     payment-success page, but we also want it to recover if they close
//     the modal accidentally — eligibility surfaces the pending order so
//     we can re-prompt on any subsequent visit.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { spinAPI, walletAPI } from '@/lib/api';
import SpinModal from './SpinModal';

const POLL_KEY = 'rupalsha:spin:lastCheck';
const POLL_INTERVAL_MS = 60 * 1000; // re-check eligibility at most once per minute

export default function SpinController() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const pathname = usePathname();

  const [config, setConfig] = useState(null);
  const [active, setActive] = useState(null); // { type, segments, orderId? }
  const checkedRef = useRef(false);

  // Load wheel config once. Static for a given deploy so cache-on-first-call
  // is fine.
  useEffect(() => {
    spinAPI.config().then(setConfig).catch(() => {});
  }, []);

  // Decide which (if any) spin to show. Runs on auth flip, route change, and
  // a soft poll interval so a newly-eligible comeback spin shows up without
  // a hard refresh.
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (active) return;
    if (!config) return;

    // Throttle network calls — don't re-check on every route change within
    // the same minute.
    const last = Number(sessionStorage.getItem(POLL_KEY) || 0);
    if (Date.now() - last < POLL_INTERVAL_MS && checkedRef.current) return;
    checkedRef.current = true;
    sessionStorage.setItem(POLL_KEY, String(Date.now()));

    spinAPI.eligibility().then((elig) => {
      if (elig.welcome) {
        setActive({ type: 'welcome', segments: config.welcome });
        return;
      }
      // Post-purchase only auto-prompts when the user is on a payment-success
      // / order-confirmation surface. Avoid hijacking unrelated page visits
      // with a "spin for your order" popup. The user can still trigger it
      // manually from /orders if desired.
      const onSuccessPage =
        pathname?.startsWith('/checkout') ||
        pathname?.startsWith('/orders');
      if (onSuccessPage && elig.postPurchase?.length > 0) {
        const next = elig.postPurchase[0];
        setActive({
          type: 'post_purchase',
          segments: config.post_purchase,
          orderId: next.orderId,
          orderNumber: next.orderNumber,
        });
        return;
      }
      if (elig.comeback) {
        setActive({ type: 'comeback', segments: config.comeback });
      }
    }).catch(() => {});
  }, [isAuthenticated, authLoading, config, pathname, active]);

  if (!active) return null;

  return (
    <SpinModal
      type={active.type}
      segments={active.segments}
      orderId={active.orderId}
      orderNumber={active.orderNumber}
      returnWindowDays={config?.rules?.returnWindowDays ?? 7}
      onClose={async (result) => {
        setActive(null);
        // If a win was credited to the wallet directly, refresh wallet so
        // any header balance pill updates without a manual reload.
        if (result?.outcome === 'won' && (active.type === 'welcome' || active.type === 'comeback')) {
          try { await walletAPI.get(); } catch {}
        }
      }}
    />
  );
}
