'use client';

/**
 * Auth-gating primitives.
 * --------------------------------------------------------------------------
 * Two complementary APIs that share the same redirect-+-open-modal logic:
 *
 *   1. <RequireAuth fallback={…}>{children}</RequireAuth>
 *      Wrapper component for pages whose body can be cleanly conditional.
 *
 *   2. const isAuthed = useRequireAuth()
 *      Hook for pages with deep existing state that can't easily be split.
 *      Returns `true` once the viewer is authenticated and safe to render.
 *
 * Both delegate to a single `useAuthGate()` so the redirect rules live in
 * one place and stay consistent across every protected route.
 *
 * Why useLayoutEffect: it runs synchronously *before* the next browser
 * paint, so unauthenticated users never see a flash of protected-page
 * content while React schedules the redirect.
 *
 * Why redirectedRef: React.StrictMode mounts effects twice in dev, and
 * client-side navigation can re-enter this effect during transitions.
 * The ref guarantees exactly one router.replace + one modal open per
 * logged-out session.
 */

import { useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAuthModalStore } from '@/lib/store';

function useAuthGate(redirectTo = '/') {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();
  const redirectedRef = useRef(false);

  useLayoutEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      redirectedRef.current = false;
      return;
    }
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace(redirectTo);
    // getState avoids subscribing this hook to modal-store re-renders.
    useAuthModalStore.getState().open('login');
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}

export function useRequireAuth(redirectTo = '/') {
  const { isAuthenticated } = useAuthGate(redirectTo);
  return isAuthenticated;
}

export default function RequireAuth({ children, fallback = null, redirectTo = '/' }) {
  const { isAuthenticated } = useAuthGate(redirectTo);
  return isAuthenticated ? children : fallback;
}
