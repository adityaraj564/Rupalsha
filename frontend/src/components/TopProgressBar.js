'use client';

// Lightweight top progress bar that signals route transitions.
//
// Why this approach (vs full-page skeletons):
//  - Zero render cost on cached pages (the bar mounts once, stays hidden)
//  - Animation triggered ONLY by user clicks on internal links, then
//    completed when the new pathname arrives. No polling, no timers fired
//    on every render.
//  - 2px bar uses GPU-accelerated transform \u2014 doesn't trigger layout.
//
// If a navigation is instant (cached / prefetched) the bar simply flashes
// once \u2014 still useful as a visual ack that the click registered.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function TopProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const incTimer = useRef(null);
  const isNavigating = useRef(false);

  // Start the bar on internal-link clicks. We attach a single capture-phase
  // listener at the document level so it works regardless of which
  // component rendered the <a>.
  useEffect(() => {
    const handleClick = (e) => {
      // Ignore if user is using middle-click / cmd-click / shift-click etc.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target.closest && e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;
      // Skip anchors, external links, mailto/tel, new-tab links, downloads.
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        link.target === '_blank' ||
        link.hasAttribute('download')
      ) return;
      // Ignore absolute URLs that point off-domain.
      if (/^https?:\/\//i.test(href)) {
        try {
          const u = new URL(href);
          if (u.host !== window.location.host) return;
        } catch { return; }
      }
      // Same path? Don't animate.
      const targetPath = href.startsWith('/') ? href.split('?')[0].split('#')[0] : null;
      if (targetPath && targetPath === pathname) return;

      isNavigating.current = true;
      setVisible(true);
      setProgress(20);

      // Trickle: incrementally advance up to ~85% while waiting.
      clearInterval(incTimer.current);
      incTimer.current = setInterval(() => {
        setProgress((p) => (p < 85 ? p + (90 - p) * 0.1 : p));
      }, 200);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  // When pathname changes, treat it as navigation-complete.
  useEffect(() => {
    if (!isNavigating.current) return;
    isNavigating.current = false;
    clearInterval(incTimer.current);
    setProgress(100);
    const t = setTimeout(() => { setVisible(false); setProgress(0); }, 200);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2px] z-[9999] pointer-events-none"
    >
      <div
        className="h-full bg-brand-gold transition-[width] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 8px rgba(212, 175, 55, 0.7), 0 0 4px rgba(212, 175, 55, 0.5)',
        }}
      />
    </div>
  );
}
