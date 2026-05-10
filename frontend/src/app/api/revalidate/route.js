// On-demand ISR revalidation endpoint.
//
// Called by the backend (see backend/utils/revalidate.js) immediately after
// any admin write that mutates data referenced by serverApi.js tags
// (banners, products, categories, pages). Lets us keep aggressive ISR
// caching for performance, while still showing edits "instantly".
//
// Security: requires the shared REVALIDATE_SECRET header. The route does
// not enumerate or expose tags, so a leaked secret can only force a cache
// purge — no data exfiltration risk.

import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// Whitelist of tags we are willing to revalidate. Defense in depth:
// even with a valid secret, callers can only invalidate known caches.
const ALLOWED_TAGS = new Set(['banners', 'products', 'categories', 'pages']);

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const secret = request.headers.get('x-revalidate-secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const tags = Array.isArray(body?.tags) ? body.tags : [];
  const revalidated = [];
  for (const tag of tags) {
    if (typeof tag === 'string' && ALLOWED_TAGS.has(tag)) {
      revalidateTag(tag);
      revalidated.push(tag);
    }
  }

  return NextResponse.json({ ok: true, revalidated });
}
