'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { GA_MEASUREMENT_ID, gaPageView } from '@/lib/analytics';

/**
 * Mounts the Google Analytics 4 (gtag.js) script and fires a `page_view`
 * on every client-side route change.
 *
 * Next.js' App Router does NOT trigger a full page reload between
 * routes, so the default GA auto page-view (which only fires on the
 * initial script load) would miss most navigations. We re-fire it
 * manually whenever the pathname or query string changes.
 *
 * Renders nothing when NEXT_PUBLIC_GA_ID is unset, so previews and
 * local dev don't pollute analytics.
 */
function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    const qs = searchParams?.toString();
    const url = pathname + (qs ? `?${qs}` : '');
    gaPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export default function Analytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          // send_page_view:false — we fire page_view manually on route
          // changes so SPA navigations are tracked correctly.
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
      {/* useSearchParams must live inside Suspense in the App Router. */}
      <Suspense fallback={null}>
        <AnalyticsInner />
      </Suspense>
    </>
  );
}
