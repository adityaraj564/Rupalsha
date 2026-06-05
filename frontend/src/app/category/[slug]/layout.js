// Server layout for /category/[slug]. Provides per-category SEO metadata
// (title, description, canonical, OG) and a BreadcrumbList JSON-LD that
// helps Google show a category breadcrumb under the URL in the SERP.
//
// The actual page UI is rendered by the client component
// `./page.js` — this layout simply wraps it so the metadata + structured
// data live on the server.

import { serverFetchSafe } from '@/lib/serverApi';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com';

async function getCategory(slug) {
  return serverFetchSafe(`/categories/${encodeURIComponent(slug)}`, {
    revalidate: 300,
    tags: ['categories', `category:${slug}`],
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getCategory(slug);
  const cat = data?.category;
  if (!cat) {
    return {
      title: 'Category — Rupalsha',
      description: 'Browse our jewellery collection.',
    };
  }
  const title = cat.seoTitle?.trim() || `${cat.name} — Shop ${cat.name} | Rupalsha`;
  const description = cat.description
    ? String(cat.description).replace(/<[^>]+>/g, '').slice(0, 160)
    : `Explore ${cat.name} at Rupalsha — anti-tarnish, waterproof, skin-friendly jewellery designed for everyday wear.`;
  const url = `${SITE_URL}/category/${cat.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function CategoryLayout({ children, params }) {
  const { slug } = await params;
  const data = await getCategory(slug);
  const cat = data?.category;
  const ancestors = data?.ancestors || [];

  const crumbs = [
    { name: 'Home', item: SITE_URL },
    { name: 'Shop All', item: `${SITE_URL}/products` },
    ...ancestors.map((a) => ({
      name: a.name,
      item: `${SITE_URL}/category/${a.slug}`,
    })),
    ...(cat
      ? [{ name: cat.name, item: `${SITE_URL}/category/${cat.slug}` }]
      : []),
  ];

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
      {/* SEO content block — rendered AFTER the product grid so it doesn't
          push products below the fold. Googlebot reads the full HTML
          regardless of visual position, so this gets the same SEO benefit
          as a top-of-page block while keeping the UI clean.
          Hidden entirely when the admin hasn't written a description. */}
      {cat?.description ? (
        <section className="w-full px-4 sm:px-6 lg:px-20 xl:px-32 pb-12 pt-4 border-t border-gray-100 dark:border-gray-800 mt-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-lg md:text-xl text-brand-charcoal dark:text-gray-200 mb-3">
              About {cat.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">
              {cat.description}
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
