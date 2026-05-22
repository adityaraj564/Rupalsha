'use client';

// Renders when the product server component (or any client component
// below it) throws — e.g. a transient backend error from serverFetch.
// Critically, this is NOT cached by Next.js, so a temporary 500/network
// blip during an admin write no longer freezes the page on a 404 for
// the ISR window. The user gets a retry button instead.

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProductError({ error, reset }) {
  useEffect(() => {
    // Surface in browser console + any wired-up error reporter.
    // eslint-disable-next-line no-console
    console.error('[product page error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <h1 className="text-2xl font-semibold text-brand-green">
          Something went wrong loading this product
        </h1>
        <p className="text-gray-600">
          This is usually a brief hiccup. Please try again in a moment — the
          product itself is fine.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-brand-green text-white rounded-md hover:opacity-90 transition"
          >
            Try again
          </button>
          <Link
            href="/products"
            className="px-5 py-2.5 border border-brand-green text-brand-green rounded-md hover:bg-brand-beige transition"
          >
            Browse all products
          </Link>
        </div>
      </div>
    </div>
  );
}
