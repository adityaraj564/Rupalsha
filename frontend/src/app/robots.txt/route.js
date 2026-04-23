const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rupalsha.com').replace(/\/$/, '');

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /content-admin
Disallow: /subadmin
Disallow: /auth
Disallow: /checkout
Disallow: /cart
Disallow: /orders
Disallow: /profile
Disallow: /wishlist

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
