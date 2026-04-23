'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Google AdSense Auto Ads (+ Anchor Ads) loader.
 *
 * Auto Ads placement decisions (including the bottom Anchor ad) are controlled
 * from the AdSense dashboard once Auto Ads is enabled for this property.
 * We simply load the AdSense loader script — nothing else is pushed or
 * customized, per AdSense policy (no modification of AdSense code).
 *
 * The loader is conditionally NOT rendered on the routes listed below, so
 * Auto Ads (and the Anchor ad) will not appear there:
 *   - /auth/*       (login, register, forgot/reset password)
 *   - /checkout, /payment
 *   - /admin, /content-admin, /subadmin dashboards
 */
const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-5385129928466192';

const EXCLUDED_PREFIXES = [
  '/auth',
  '/checkout',
  '/payment',
  '/admin',
  '/content-admin',
  '/subadmin',
];

export default function AutoAds() {
  const pathname = usePathname() || '/';

  const isExcluded = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isExcluded) return null;
  if (!ADSENSE_CLIENT_ID) return null;

  return (
    <Script
      id="adsbygoogle-loader"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  );
}
