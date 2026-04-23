'use client';

import { usePathname } from 'next/navigation';
import AdBanner from './AdBanner';

/**
 * Top horizontal AdSense strip shown on content pages.
 *
 * Excluded routes (AdSense policy / UX):
 *   - Auth flows (login, register, forgot/reset password)
 *   - Checkout & payment
 *   - Admin / Subadmin dashboards
 *
 * Uses a responsive AdSense unit (data-ad-format="auto" +
 * data-full-width-responsive="true"). Sizes are controlled by Google
 * — we do NOT modify ad dimensions manually.
 *
 * A minimum 24px gap is kept below the ad to prevent accidental clicks
 * on the site header / nav, per AdSense placement policy.
 */
const EXCLUDED_PREFIXES = [
  '/auth',            // /auth/login, /auth/register, /auth/forgot-password, /auth/reset-password
  '/checkout',
  '/payment',
  '/admin',
  '/content-admin',
  '/subadmin',
];

export default function TopAdStrip() {
  const pathname = usePathname() || '/';

  const isExcluded = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isExcluded) return null;

  // Optional: only render if the slot is configured, so we don't show an
  // empty container in development.
  const slot = process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT;
  if (!slot) return null;

  return (
    <aside
      role="complementary"
      aria-label="Advertisement"
      className="w-full bg-transparent"
      // Enforce a safe gap between the ad and the site header / nav.
      style={{ paddingTop: 8, paddingBottom: 24 }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 text-center mb-1 select-none">
          Advertisement
        </div>
        <AdBanner adSlot={slot} format="auto" />
      </div>
    </aside>
  );
}
