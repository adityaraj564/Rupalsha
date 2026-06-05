// Clean-URL landing page for trending picks.
// See /new-arrivals/page.js for the rationale — same pattern, locked to
// trending=true with its own SEO metadata so Google can promote it as a
// distinct sitelink under the Rupalsha brand result.

import { Suspense } from 'react';
import ProductsListClient from '../products/ProductsListClient';
import { serverFetch, serverHomeAPI } from '@/lib/serverApi';

export const revalidate = 60;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com').replace(/\/$/, '');

export const metadata = {
  title: 'Trending Jewellery — Rupalsha',
  description:
    'Shop the most-loved, best-selling jewellery at Rupalsha — trending necklaces, earrings, rings and bangles handpicked by our community.',
  alternates: { canonical: `${SITE_URL}/trending` },
  openGraph: {
    title: 'Trending Jewellery — Rupalsha',
    description:
      'Shop the most-loved, best-selling jewellery at Rupalsha.',
    url: `${SITE_URL}/trending`,
    type: 'website',
  },
};

export default async function TrendingPage() {
  const qs = new URLSearchParams({
    page: '1',
    limit: '12',
    sort: 'newest',
    trending: 'true',
    hideOutOfStock: 'true',
  });

  const [productsData, categoriesData] = await Promise.all([
    serverFetch(`/products?${qs.toString()}`, { revalidate: 60, tags: ['products'] }),
    serverHomeAPI.categories(),
  ]);

  return (
    <Suspense fallback={null}>
      <ProductsListClient
        lockedFilter="trending"
        initialProducts={productsData?.products || []}
        initialTotal={productsData?.total || 0}
        initialTotalPages={productsData?.totalPages || 1}
        initialCategoryTree={categoriesData?.categories || []}
      />
    </Suspense>
  );
}
