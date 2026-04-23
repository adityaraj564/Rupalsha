/**
 * SEO sitemap for Google Search Console + Merchant Center.
 * Accessed at: https://rupalsha.com/sitemap.xml
 */

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rupalsha.com').replace(/\/$/, '');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rupalsha-backend.onrender.com/api';

const STATIC_PATHS = [
  '',
  '/products',
  '/about',
  '/blog',
  '/help',
];

function xml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchAllProducts() {
  const all = [];
  let page = 1;
  while (page <= 40) {
    const res = await fetch(
      `${API_URL}/products?limit=50&page=${page}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const products = data?.products || [];
    all.push(...products);
    if (products.length < 50) break;
    page += 1;
  }
  return all;
}

async function fetchCategories() {
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.categories || data || [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [products, categories] = await Promise.all([
      fetchAllProducts(),
      fetchCategories(),
    ]);

    const urls = [
      ...STATIC_PATHS.map((p) => ({
        loc: `${SITE_URL}${p}`,
        changefreq: 'daily',
        priority: p === '' ? '1.0' : '0.8',
      })),
      ...categories
        .filter((c) => c?.slug)
        .map((c) => ({
          loc: `${SITE_URL}/category/${c.slug}`,
          changefreq: 'daily',
          priority: '0.7',
        })),
      ...products
        .filter((p) => p?.slug)
        .map((p) => ({
          loc: `${SITE_URL}/product/${p.slug}`,
          lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
          changefreq: 'weekly',
          priority: '0.9',
        })),
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${xml(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    return new Response(
      `<?xml version="1.0"?><error>${xml(err.message || 'Sitemap generation failed')}</error>`,
      { status: 500, headers: { 'Content-Type': 'application/xml' } }
    );
  }
}
