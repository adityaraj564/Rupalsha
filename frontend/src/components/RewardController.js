'use client';

// RewardController — single mount in app/layout.js. Auto-prompts the
// post-purchase scratch coupon when the user lands on the order success
// page after checkout. No other reward types pop up automatically — users
// can claim any pending reward from the /rewards page.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { rewardsAPI } from '@/lib/api';
import RewardModal from './RewardModal';

// Soft floor on how often we hit /eligibility for the SAME path — protects
// against rapid re-renders. Path changes always bypass this.
const MIN_INTERVAL_MS = 5 * 1000;

// Let the order-success banner + confetti fully play out before the coupon
// flies in. ConfettiBurst lasts 2.6s; we add breathing room so the user can
// read "Order Placed Successfully" before the scratch card takes over the
// screen. Mirrors how Flipkart / Amazon stage their reward popup well AFTER
// the order confirmation lands.
const POST_PURCHASE_DELAY_MS = 4500;

// Per-order dismissal log. Once the user closes the modal without
// scratching, we never auto-prompt that order's reward again — the only
// way back in is the /rewards page, which deliberately ignores this list.
const DISMISSED_KEY = 'rupalsha_rewards_dismissed';

const orderDismissalId = (orderId) => `post_purchase:${orderId}`;

const readDismissed = () => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
};

const markDismissed = (id) => {
  const s = readDismissed();
  s.add(id);
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s])); } catch {}
};

export default function RewardController() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const pathname = usePathname();

  const [config, setConfig] = useState(null);
  const [active, setActive] = useState(null); // { orderId, orderNumber, segments }
  const lastCheckedPathRef = useRef(null);
  const lastCheckedAtRef = useRef(0);
  const pendingTimerRef = useRef(null);

  // Load reward config once. Static for a given deploy.
  useEffect(() => {
    rewardsAPI.config().then(setConfig).catch(() => {});
  }, []);

  // Clear any pending delayed-coupon timer on unmount.
  useEffect(() => () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  }, []);

  // Decide whether to auto-prompt the post-purchase reward. Runs on auth flip
  // + route change so the coupon fires the moment the user lands on the
  // order success page after checkout.
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (active) return;
    if (!config) return;
    // The /rewards page renders its own modal so users can re-open dismissed
    // cards manually. Skip the auto-prompt there to avoid double modals.
    if (pathname?.startsWith('/rewards')) return;
    // Only auto-prompt on checkout / order surfaces so we don't hijack
    // unrelated pages.
    const onOrderSurface =
      pathname?.startsWith('/checkout') ||
      pathname?.startsWith('/orders');
    if (!onOrderSurface) return;

    // Bypass throttle whenever the pathname has changed since the last
    // check — every navigation gets a fresh eligibility lookup.
    const now = Date.now();
    const pathChanged = lastCheckedPathRef.current !== pathname;
    if (!pathChanged && now - lastCheckedAtRef.current < MIN_INTERVAL_MS) return;
    lastCheckedPathRef.current = pathname;
    lastCheckedAtRef.current = now;

    rewardsAPI.eligibility().then((elig) => {
      if (!elig.postPurchase?.length) return;
      const dismissed = readDismissed();
      const next = elig.postPurchase.find(
        (o) => !dismissed.has(orderDismissalId(o.orderId))
      );
      if (!next) return;

      // Delay so the success banner + confetti play first.
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        setActive({
          orderId: next.orderId,
          orderNumber: next.orderNumber,
          segments: config.post_purchase,
        });
      }, POST_PURCHASE_DELAY_MS);
    }).catch(() => {});
  }, [isAuthenticated, authLoading, config, pathname, active]);

  if (!active) return null;

  return (
    <RewardModal
      type="post_purchase"
      segments={active.segments}
      orderId={active.orderId}
      orderNumber={active.orderNumber}
      returnWindowDays={config?.rules?.returnWindowDays ?? 7}
      onClose={(result) => {
        // No result = user closed via the X without scratching. Remember
        // that so we never auto-pop this order's reward again. They can
        // still claim it manually from the /rewards page.
        if (!result) markDismissed(orderDismissalId(active.orderId));
        setActive(null);
      }}
    />
  );
}
