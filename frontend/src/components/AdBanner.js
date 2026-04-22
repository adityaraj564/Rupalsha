'use client';

import { useEffect, useRef } from 'react';

/**
 * Google AdSense ad banner component.
 * 
 * Props:
 *   adSlot   — Your ad unit slot ID (from AdSense dashboard)
 *   format   — Ad format: 'auto' (default), 'horizontal', 'rectangle', 'vertical'
 *   className — Extra wrapper classes
 */
export default function AdBanner({ adSlot, format = 'auto', className = '' }) {
  const adRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
        pushed.current = true;
      }
    } catch (e) {
      // AdSense not loaded or ad blocker active
    }
  }, []);

  if (!adSlot) return null;

  return (
    <div className={`ad-banner overflow-hidden text-center ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_ID}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
        ref={adRef}
      />
    </div>
  );
}
