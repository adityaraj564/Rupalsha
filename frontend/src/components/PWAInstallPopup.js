'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DISMISS_KEY = 'rupalsha_pwa_dismiss';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function wasDismissed() {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const timestamp = parseInt(dismissed, 10);
    if (Date.now() - timestamp < DISMISS_DURATION) return true;
    localStorage.removeItem(DISMISS_KEY);
    return false;
  } catch {
    return false;
  }
}

export default function PWAInstallPopup() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isiOS, setIsiOS] = useState(false);
  const timerRef = useRef(null);

  // Capture beforeinstallprompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect if already installed
    if (isInStandaloneMode()) {
      setIsInstalled(true);
    }

    // Listen for app installed
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Show popup after delay
  useEffect(() => {
    if (isInStandaloneMode() || wasDismissed()) return;

    setIsiOS(isIOS());

    timerRef.current = setTimeout(() => {
      setVisible(true);
      // Trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
      } catch {}
    }, 350);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    dismiss();
  }, [deferredPrompt, dismiss]);

  const handleOpenApp = useCallback(() => {
    // Try opening in standalone mode
    window.location.href = window.location.origin;
    dismiss();
  }, [dismiss]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          animateIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Popup */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-popup-title"
        className={`fixed z-[9999] transition-all duration-350 ease-out
          /* Mobile: bottom sheet */
          bottom-0 left-0 right-0 mx-auto
          /* Desktop: centered floating card */
          sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:max-w-[420px] sm:rounded-2xl
          /* Shared */
          w-full rounded-t-3xl sm:rounded-3xl
          bg-white dark:bg-gray-900
          shadow-[0_-8px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.5)]
          overflow-hidden
          ${animateIn
            ? 'translate-y-0 opacity-100 sm:translate-y-0'
            : 'translate-y-full opacity-0 sm:translate-y-8'
          }
        `}
      >
        {/* Drag indicator (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-500 dark:text-gray-400">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Content */}
        <div className="px-6 pt-4 pb-6 sm:px-8 sm:pt-6 sm:pb-8">
          {/* Logo + Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-green flex items-center justify-center shadow-lg overflow-hidden">
                <img
                  src="/Rupalsha.png"
                  alt="Rupalsha"
                  width={48}
                  height={48}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                />
              </div>
              {/* Install badge */}
              {!isInstalled && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-gold rounded-full flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1V9M1 5H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="pwa-popup-title" className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                ✨ Shop faster with the Rupalsha App
              </h2>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
            Get a smoother shopping experience, quick checkout, and instant access to your wishlist.
          </p>

          {/* iOS Safari Instructions */}
          {isiOS && !isInstalled && !deferredPrompt && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                  Tap{' '}
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Share
                  </span>{' '}
                  → <strong>Add to Home Screen</strong>
                </p>
              </div>
            </div>
          )}

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {['Fast & Smooth', 'Offline Access', 'Push Alerts'].map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/5 dark:bg-brand-green/20 text-brand-green dark:text-emerald-300 border border-brand-green/10 dark:border-emerald-700"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-2.5">
            {isInstalled ? (
              <button
                onClick={handleOpenApp}
                className="w-full py-3.5 px-6 rounded-2xl bg-brand-green text-white font-semibold text-sm sm:text-base shadow-lg shadow-brand-green/25 hover:shadow-xl hover:shadow-brand-green/30 active:scale-[0.98] transition-all duration-200"
              >
                Open App
              </button>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full py-3.5 px-6 rounded-2xl bg-brand-green text-white font-semibold text-sm sm:text-base shadow-lg shadow-brand-green/25 hover:shadow-xl hover:shadow-brand-green/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install App
              </button>
            ) : isiOS ? (
              <button
                onClick={dismiss}
                className="w-full py-3.5 px-6 rounded-2xl bg-brand-green text-white font-semibold text-sm sm:text-base shadow-lg shadow-brand-green/25 hover:shadow-xl hover:shadow-brand-green/30 active:scale-[0.98] transition-all duration-200"
              >
                Got it!
              </button>
            ) : null}

            <button
              onClick={dismiss}
              className="w-full py-3 px-6 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all duration-200"
            >
              Continue in Browser
            </button>
          </div>

          {/* Trust indicator */}
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-4">
            Free • No storage issues • Works offline
          </p>
        </div>
      </div>
    </>
  );
}
