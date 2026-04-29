// Server Component for /product/[slug]. Fetches the product on the server
// and ships pre-rendered HTML so the user sees text + images immediately.
//
// All interactive bits (cart, wishlist, reviews, video player) live inside
// <ProductDetailClient />, which receives the product as `initialProduct`
// to skip the loading skeleton on first paint.

import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { serverProductsAPI } from '@/lib/serverApi';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await serverProductsAPI.product(slug);
  const product = data?.product;
  if (!product) return { title: 'Product not found — Rupalsha' };
  const title = `${product.name} — Rupalsha`;
  const description = (product.shortDescription || product.description || '')
    .replace(/<[^>]+>/g, '')
    .slice(0, 160);
  const image = product.images?.[0]?.url;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const data = await serverProductsAPI.product(slug);
  const product = data?.product;

  // Treat missing product as 404 — Next will render the not-found page and
  // return a proper status code (better for SEO than a soft redirect).
  if (!product) notFound();

  return <ProductDetailClient initialProduct={product} />;
}
