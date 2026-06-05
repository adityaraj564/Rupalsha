// Clean-URL landing page for new arrivals.
// Mirrors the /products page but locks the API filter to featured=true and
// owns its own SEO metadata. Giving this section a distinct, indexable URL
// (instead of /products?featured=true) lets Google treat it as a separate
// page and pick it as a sitelink.

import { Suspense } from 'react';
import ProductsListClient from '../products/ProductsListClient';
import { serverFetch, serverHomeAPI } from '@/lib/serverApi';

export const revalidate = 60;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com').replace(/\/$/, '');

export const metadata = {
  title: 'New Arrivals — Rupalsha',
  description:
    'Discover the latest anti-tarnish, waterproof jewellery just landed at Rupalsha — fresh necklaces, earrings, rings and bangles added every week.',
  alternates: { canonical: `${SITE_URL}/new-arrivals` },
  openGraph: {
    title: 'New Arrivals — Rupalsha',
    description:
      'Discover the latest anti-tarnish, waterproof jewellery just landed at Rupalsha.',
    url: `${SITE_URL}/new-arrivals`,
    type: 'website',
  },
};

export default async function NewArrivalsPage() {
  const qs = new URLSearchParams({
    page: '1',
    limit: '12',
    sort: 'newest',
    featured: 'true',
    hideOutOfStock: 'true',
  });

  const [productsData, categoriesData] = await Promise.all([
    serverFetch(`/products?${qs.toString()}`, { revalidate: 60, tags: ['products'] }),
    serverHomeAPI.categories(),
  ]);

  return (
    <Suspense fallback={null}>
      <ProductsListClient
        lockedFilter="featured"
        initialProducts={productsData?.products || []}
        initialTotal={productsData?.total || 0}
        initialTotalPages={productsData?.totalPages || 1}
        initialCategoryTree={categoriesData?.categories || []}
      />
    </Suspense>
  );
}
