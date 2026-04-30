'use client';

// The standalone /auth/register screen has been retired in favour of a
// global popup. Visiting this URL opens the modal in register mode and
// bounces the user back to where they came from.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthModalStore, useAuthStore } from '@/lib/store';

export default function RegisterRedirect() {
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
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.replace('/');
    }
    const t = setTimeout(() => open('register'), 50);
    return () => clearTimeout(t);
  }, [authLoading, isAuthenticated, open, router]);

  return null;
}
