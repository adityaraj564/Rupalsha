'use client';

// The standalone /auth/login screen has been retired in favour of a
// global popup that opens over whatever page the user was on. Any
// lingering link or `router.push('/auth/login')` still lands here, but
// instead of rendering a full page we just trigger the modal and bounce
// the user back to a sensible context (the home page, or the previous
// page if there's a real history entry to go back to).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthModalStore, useAuthStore } from '@/lib/store';

export default function LoginRedirect() {
  const router = useRouter();
  const open = useAuthModalStore((s) => s.open);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      router.replace('/');
      return;
    }
    // Open the popup synchronously, *then* swap the underlying route so the
    // user only sees one transition (modal-over-home). The previous 50ms
    // setTimeout caused a visible flicker between "blank /auth/login" and
    // the destination page.
    open('login');
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, open, router]);

  return null;
}
