// Server Component (no 'use client'). Runs at build/request time on the
// Next.js server and ships pre-rendered HTML to the browser. Interactive
// bits live inside <HomePageClient />.
//
// Data is fetched in parallel and cached for ~60s via ISR — most visitors
// get an instant edge response with zero database round-trips.

import HomePageClient from './HomePageClient';
import { serverHomeAPI } from '@/lib/serverApi';

// Re-generate this page at most once per minute. Banners/pages have longer
// individual cache windows in serverApi.js.
export const revalidate = 60;

const PAGE_KEYS = ['special-offer', 'home-hero', 'home-features', 'home-marquee', 'footer-about'];

export default async function HomePage() {
  // Fire all backend calls in parallel. Any individual failure resolves to
  // null and the client falls back to its own defaults.
  const [bannersData, categoriesData, pagesData, featuredData, trendingData] = await Promise.all([
    serverHomeAPI.banners(),
    serverHomeAPI.categories(),
    serverHomeAPI.pages(PAGE_KEYS),
    serverHomeAPI.featured(),
    serverHomeAPI.trending(),
  ]);

  const banners = Array.isArray(bannersData) ? bannersData : [];
  const categoriesRaw = categoriesData?.categories || [];
  const pages = pagesData?.pages || {};
  const featured = featuredData?.products || [];
  const trending = trendingData?.products || [];

  // Same color/image mapping as the client previously did, but applied
  // server-side so the markup contains finished category cards.
  const DEFAULT_CATEGORY_IMAGES = {
    necklaces: '/defaults/cat-necklaces.jpg',
    earrings: '/defaults/cat-earrings.jpg',
    bangles: '/defaults/cat-bangles.jpg',
    rings: '/defaults/cat-rings.jpg',
    anklets: '/defaults/cat-anklets.jpg',
  };
  const GRADIENT_COLORS = [
    'from-rose-900/60', 'from-amber-900/60', 'from-emerald-900/60',
    'from-indigo-900/60', 'from-purple-900/60', 'from-teal-900/60',
    'from-pink-900/60', 'from-cyan-900/60',
  ];
  const categories = categoriesRaw.map((cat, i) => ({
    name: cat.name,
    slug: cat.slug,
    image: cat.image?.url || DEFAULT_CATEGORY_IMAGES[cat.slug] || `/defaults/cat-${cat.slug}.jpg`,
    color: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
  }));

  const marqueeItems = pages['home-marquee']?.content
    ? String(pages['home-marquee'].content).split('|').map((s) => s.trim()).filter(Boolean)
    : undefined;

  return (
    <HomePageClient
      initialBanners={banners}
      initialCategories={categories}
      initialFeatured={featured}
      initialTrending={trending}
      initialSpecialOffer={pages['special-offer'] || null}
      initialHero={pages['home-hero'] || null}
      initialFeatures={pages['home-features']?.features?.length ? pages['home-features'].features : undefined}
      initialMarqueeItems={marqueeItems}
    />
  );
}
