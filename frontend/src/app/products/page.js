// Server Component for /products. Reads URL filters from `searchParams`,
// fetches the matching first page of products on the server with ISR, and
// hands them to the interactive listing client component.
//
// Filter changes (sort, price, size, category) still happen client-side via
// the existing logic in ProductsListClient.js \u2014 this only accelerates the
// first render.

import { Suspense } from 'react';
import ProductsListClient from './ProductsListClient';
import { serverFetch, serverHomeAPI } from '@/lib/serverApi';

// Filters can be arbitrary, so we serve the page on-demand. ISR still
// caches identical query-string combinations for `revalidate` seconds.
export const revalidate = 60;

export const metadata = {
  title: 'Shop All — Rupalsha',
  description: 'Browse our full jewellery collection — necklaces, earrings, bangles, rings and more.',
};

export default async function ProductsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const get = (k) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) || '';

  // Build the same query string the client would build for page 1.
  const qs = new URLSearchParams();
  qs.set('page', '1');
  qs.set('limit', '12');
  qs.set('sort', get('sort') || 'newest');
  if (get('category')) qs.set('categorySlug', get('category'));
  if (get('search'))   qs.set('search', get('search'));
  if (get('minPrice')) qs.set('minPrice', get('minPrice'));
  if (get('maxPrice')) qs.set('maxPrice', get('maxPrice'));
  if (get('size'))     qs.set('size', get('size'));
  if (get('featured')) qs.set('featured', 'true');
  if (get('trending')) qs.set('trending', 'true');
  // Hide out-of-stock by default for SSR \u2014 logged-in users get the full
  // list refetched client-side once auth state hydrates.
  qs.set('hideOutOfStock', 'true');

  const [productsData, categoriesData] = await Promise.all([
    serverFetch(`/products?${qs.toString()}`, { revalidate: 60, tags: ['products'] }),
    serverHomeAPI.categories(),
  ]);

  return (
    // ProductsListClient calls useSearchParams() — wrap in Suspense so the
    // page can be statically prerendered with the server-fetched data.
    <Suspense fallback={null}>
      <ProductsListClient
        initialProducts={productsData?.products || []}
        initialTotal={productsData?.total || 0}
        initialTotalPages={productsData?.totalPages || 1}
        initialCategoryTree={categoriesData?.categories || []}
      />
    </Suspense>
  );
}
