// Server Component for /product/[slug]. Fetches the product on the server
// and ships pre-rendered HTML so the user sees text + images immediately.
//
// All interactive bits (cart, wishlist, reviews, video player) live inside
// <ProductDetailClient />, which receives the product as `initialProduct`
// to skip the loading skeleton on first paint.

import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { serverProductsAPI } from '@/lib/serverApi';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com';

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
  const url = `${SITE_URL}/product/${product.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: image ? [{ url: image }] : undefined,
      type: 'website',
    },
  };
}

// Build the structured-data graph Google uses to render rich product
// results (price, availability, rating stars) and a breadcrumb trail
// under the URL in the SERP.
function buildJsonLd(product) {
  const url = `${SITE_URL}/product/${product.slug}`;
  const description = (product.shortDescription || product.description || '')
    .replace(/<[^>]+>/g, '')
    .slice(0, 5000);
  const images = (product.images || [])
    .map((i) => i?.url)
    .filter(Boolean);

  const totalStock = (product.sizes || []).reduce(
    (s, x) => s + (Number(x.stock) || 0),
    0
  );
  const availability = totalStock > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    image: images.length ? images : undefined,
    sku: product.productCode || product._id,
    mpn: product.productCode || undefined,
    brand: { '@type': 'Brand', name: 'Rupalsha' },
    category: product.category || undefined,
    offers: {
      '@type': 'Offer',
      url,
      price: Number(product.price) || 0,
      priceCurrency: 'INR',
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Rupalsha' },
      ...(product.comparePrice && Number(product.comparePrice) > Number(product.price)
        ? { priceValidUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            .toISOString().slice(0, 10) }
        : {}),
    },
  };

  // Only include aggregateRating when there are real reviews — fake or
  // zero-count ratings violate Google's structured data guidelines.
  if (Number(product.numReviews) > 0 && Number(product.averageRating) > 0) {
    productLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.averageRating).toFixed(1),
      reviewCount: Number(product.numReviews),
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop All', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: product.name, item: url },
    ],
  };

  return [productLd, breadcrumbLd];
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const data = await serverProductsAPI.product(slug);
  const product = data?.product;

  // Treat missing product as 404 — Next will render the not-found page and
  // return a proper status code (better for SEO than a soft redirect).
  if (!product) notFound();

  const jsonLd = buildJsonLd(product);

  return (
    <>
      {jsonLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      <ProductDetailClient initialProduct={product} />
    </>
  );
}
