'use client';

import { useEffect, useRef, useState } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
const loadGoogleScript = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(s);
  });
  return scriptPromise;
};

/**
 * Renders the official Google Sign-In button.
 *
 * Props:
 *   onCredential(credential): called with Google ID token after the user signs in.
 *   text: 'signin_with' | 'continue_with' (default 'continue_with')
 *   disabled: boolean
 */
export default function GoogleSignInButton({ onCredential, text = 'continue_with', disabled = false }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let cancelled = false;
    if (!clientId) {
      setError('Google sign-in is not configured');
      return;
    }
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
          },
          ux_mode: 'popup',
          auto_select: false,
          itp_support: true,
        });
        // Clear & render fresh (handles re-mounts)
        containerRef.current.innerHTML = '';
        const width = Math.min(360, containerRef.current.offsetWidth || 320);
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
        });
      })
      .catch(() => setError('Could not load Google sign-in. Please check your connection.'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, text]);

  if (!clientId) {
    return (
      <div className="text-xs text-gray-500 text-center">
        Google sign-in unavailable
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className={`flex justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        aria-label="Continue with Google"
      />
      {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
    </div>
  );
}
