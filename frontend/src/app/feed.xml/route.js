/**
 * Google Merchant Center product feed.
 *
 * Accessed at: https://rupalsha.com/feed.xml
 * Google fetches this daily once configured in Merchant Center.
 *
 * Spec: https://support.google.com/merchants/answer/7052112
 */

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Re-generate at most hourly if used in static mode

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rupalsha.com').replace(/\/$/, '');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rupalsha-backend.onrender.com/api';

// Escape special XML characters.
function xml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Strip HTML and trim to 5000 chars (Google limit).
function cleanDescription(html = '') {
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 4900);
}

// Fetch all active products (paginated, backend caps limit at 50).
async function fetchAllProducts() {
  const all = [];
  let page = 1;
  const limit = 50;
  // Safety cap: max 2000 products / 40 pages.
  while (page <= 40) {
    const res = await fetch(
      `${API_URL}/products?limit=${limit}&page=${page}&hideOutOfStock=true`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const products = data?.products || [];
    all.push(...products);
    if (products.length < limit) break;
    page += 1;
  }
  return all;
}

function productToXml(p) {
  const id = p.productCode || p._id;
  const link = `${SITE_URL}/product/${p.slug}`;
  const image = p.images?.[0]?.url || '';
  const extraImages = (p.images || []).slice(1, 11); // GMC allows up to 10 additional images

  // Availability: any size has stock?
  const hasStock = (p.sizes || []).some((s) => s.stock > 0);
  const availability = hasStock ? 'in_stock' : 'out_of_stock';

  // Price — Google requires "1234.00 INR"
  // g:price = original/regular price, g:sale_price = discounted selling price
  const hasDiscount = p.comparePrice && p.comparePrice > p.price;
  const price = hasDiscount
    ? `${Number(p.comparePrice).toFixed(2)} INR`
    : `${Number(p.price).toFixed(2)} INR`;
  const salePrice = hasDiscount
    ? `${Number(p.price).toFixed(2)} INR`
    : null;

  // Map to Google product category (https://www.google.com/basepages/producttype/taxonomy.en-US.txt)
  // Broad fashion fallback — Google will still accept; for better targeting override per-category later.
  const googleCategory = 'Apparel & Accessories > Jewelry';

  const brand = 'Rupalsha';

  const color = (p.colors || []).map((c) => c.name).filter(Boolean).join('/');
  const sizeList = (p.sizes || [])
    .filter((s) => s.stock > 0)
    .map((s) => s.size);

  // For items with variants (sizes), we emit one entry per size as a variant group.
  // Simpler approach: single parent entry with comma-separated sizes in `size` field.
  // Google recommends a variant per size, but parent is acceptable to start.
  const size = sizeList[0] || '';

  return `
  <item>
    <g:id>${xml(id)}</g:id>
    <g:title>${xml(p.name)}</g:title>
    <g:description>${xml(cleanDescription(p.description))}</g:description>
    <g:link>${xml(link)}</g:link>
    <g:image_link>${xml(image)}</g:image_link>
    ${extraImages.map((img) => `<g:additional_image_link>${xml(img.url)}</g:additional_image_link>`).join('\n    ')}
    <g:availability>${availability}</g:availability>
    <g:price>${price}</g:price>
    ${salePrice ? `<g:sale_price>${salePrice}</g:sale_price>` : ''}
    <g:brand>${xml(brand)}</g:brand>
    <g:condition>new</g:condition>
    <g:google_product_category>${xml(googleCategory)}</g:google_product_category>
    <g:product_type>${xml([p.category, p.subcategory, p.childCategory].filter(Boolean).join(' &gt; '))}</g:product_type>
    ${color ? `<g:color>${xml(color)}</g:color>` : ''}
    ${size ? `<g:size>${xml(size)}</g:size>` : ''}
    <g:identifier_exists>no</g:identifier_exists>
    <g:shipping>
      <g:country>IN</g:country>
      <g:price>${Number(p.shippingCharge || 0).toFixed(2)} INR</g:price>
    </g:shipping>
  </item>`;
}

export async function GET() {
  try {
    const products = await fetchAllProducts();

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Rupalsha — Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Shop modern anti-tarnish jewellery at RUPALSHA. Waterproof, skin-friendly and everyday jewellery.</description>
    ${products.map(productToXml).join('\n')}
  </channel>
</rss>`;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    return new Response(
      `<?xml version="1.0"?><error>${xml(err.message || 'Feed generation failed')}</error>`,
      { status: 500, headers: { 'Content-Type': 'application/xml' } }
    );
  }
}
