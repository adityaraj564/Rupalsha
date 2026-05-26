/**
 * Production-grade pincode lookup with caching + normalization.
 * Primary: India Pincode API by Aniket Thapa
 * Fallback: Zippopotam.us
 */

import { normalizeLocalityName, titleCase } from './pincodeNormalization';

const PRIMARY_API = 'https://aniket-thapa.github.io/india-pincode-api/pincodes';
const FALLBACK_API = 'https://api.zippopotam.us/in';

const CACHE_KEY = 'rupalsha_pincode_cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache (survives across calls within same session)
const memCache = new Map();

function getLocalCache() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Evict expired entries
    const now = Date.now();
    const valid = {};
    for (const [pin, entry] of Object.entries(parsed)) {
      if (now - entry.ts < CACHE_EXPIRY_MS) {
        valid[pin] = entry;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function setLocalCache(pincode, result) {
  if (typeof window === 'undefined') return;
  try {
    const cache = getLocalCache();
    cache[pincode] = { data: result, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function getCachedResult(pincode) {
  // Check memory first
  if (memCache.has(pincode)) {
    const entry = memCache.get(pincode);
    if (Date.now() - entry.ts < CACHE_EXPIRY_MS) {
      return entry.data;
    }
    memCache.delete(pincode);
  }
  // Check localStorage
  const local = getLocalCache();
  if (local[pincode]) {
    memCache.set(pincode, local[pincode]);
    return local[pincode].data;
  }
  return null;
}

function cacheResult(pincode, result) {
  memCache.set(pincode, { data: result, ts: Date.now() });
  setLocalCache(pincode, result);
}

// Prevent duplicate in-flight requests for the same pincode
const inflightRequests = new Map();

/**
 * Looks up an Indian pincode and returns normalized area/city/state.
 * Uses memory + localStorage caching (7-day expiry).
 * Returns null if pincode is invalid or not found.
 *
 * Response: { success, area, city, state, pincode, source }
 */
export async function lookupPincode(pincode) {
  if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    return null;
  }

  // Return cached result if available
  const cached = getCachedResult(pincode);
  if (cached) return cached;

  // Deduplicate concurrent requests for the same pincode
  if (inflightRequests.has(pincode)) {
    return inflightRequests.get(pincode);
  }

  const promise = _fetchPincode(pincode);
  inflightRequests.set(pincode, promise);

  try {
    const result = await promise;
    if (result) cacheResult(pincode, result);
    return result;
  } finally {
    inflightRequests.delete(pincode);
  }
}

async function _fetchPincode(pincode) {
  // Try primary API
  try {
    const res = await fetch(`${PRIMARY_API}/${pincode}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.state && data.district) {
        const deliveryOffice = data.offices?.find((o) => o.deliveryStatus === 'Delivery');
        const rawName = deliveryOffice?.officeName || data.offices?.[0]?.officeName || '';
        const area = normalizeLocalityName(rawName);
        return {
          success: true,
          area,
          city: titleCase(data.district),
          state: titleCase(data.state),
          pincode,
          source: 'primary',
        };
      }
    }
  } catch {
    // Primary failed, try fallback
  }

  // Try fallback API
  try {
    const res = await fetch(`${FALLBACK_API}/${pincode}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.places && data.places.length > 0) {
        const place = data.places[0];
        const rawName = place['place name'] || '';
        const area = normalizeLocalityName(rawName);
        return {
          success: true,
          area,
          city: area || rawName,
          state: place.state || '',
          pincode,
          source: 'fallback',
        };
      }
    }
  } catch {
    // Both APIs failed
  }

  return null;
}

/**
 * Debounced pincode lookup hook helper.
 * Returns a function that debounces calls by the given delay.
 */
export function createDebouncedLookup(delay = 300) {
  let timer = null;
  return function debouncedLookup(pincode, callback) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const result = await lookupPincode(pincode);
      callback(result);
    }, delay);
    // Return cancel function
    return () => { if (timer) clearTimeout(timer); };
  };
}
