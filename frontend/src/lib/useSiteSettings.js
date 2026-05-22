'use client';

// Tiny shared hook for the public free-shipping threshold (₹).
//
// Reads `freeShippingThreshold` from /api/settings once on mount and caches
// it in-module so subsequent components (header, cart, product page, etc.)
// don't refetch. A change in admin settings will reflect after the next
// page load — fine for a number that changes very rarely.
//
// Defaults to 999 when settings haven't loaded yet, so the UI never renders
// with `undefined`.

import { useEffect, useState } from 'react';
import { settingsAPI } from './api';

const DEFAULT_THRESHOLD = 999;

let cached = null;
let inflight = null;
const subscribers = new Set();

function loadOnce() {
  if (cached !== null) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = settingsAPI.get()
    .then((data) => {
      const n = Number(data?.freeShippingThreshold);
      cached = Number.isFinite(n) && n >= 0 ? n : DEFAULT_THRESHOLD;
      subscribers.forEach((cb) => cb(cached));
      return cached;
    })
    .catch(() => {
      cached = DEFAULT_THRESHOLD;
      subscribers.forEach((cb) => cb(cached));
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useFreeShippingThreshold() {
  const [value, setValue] = useState(cached ?? DEFAULT_THRESHOLD);

  useEffect(() => {
    if (cached !== null) {
      setValue(cached);
      return undefined;
    }
    const cb = (v) => setValue(v);
    subscribers.add(cb);
    loadOnce();
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  return value;
}

export { DEFAULT_THRESHOLD as DEFAULT_FREE_SHIPPING_THRESHOLD };
