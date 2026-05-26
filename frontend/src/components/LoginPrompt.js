'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore, useAuthModalStore } from '@/lib/store';

const PROMPT_DELAY_MS = 10000; // 10 seconds
const DISMISS_KEY = 'rupalsha_login_prompt_dismissed';

/**
 * Shows the login modal after 10s if user is not authenticated.
 * Dismissed for the rest of the session once closed.
 */
export default function LoginPrompt() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const timerRef = useRef(null);

  useEffect(() => {
    // Don't run until auth state is resolved
    if (isLoading) return;
    // Already logged in — no prompt needed
    if (isAuthenticated) return;
    // Already dismissed this session
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY)) return;

    timerRef.current = setTimeout(() => {
      // Re-check in case user logged in during the wait
      const { isAuthenticated: authed } = useAuthStore.getState();
      if (authed) return;
      // Don't open if modal is already showing
      const { isOpen } = useAuthModalStore.getState();
      if (isOpen) return;

      // Open the login modal
      useAuthModalStore.getState().open('login');
      // Mark as dismissed so it won't fire again this session
      sessionStorage.setItem(DISMISS_KEY, '1');
    }, PROMPT_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, isLoading]);

  return null;
}
