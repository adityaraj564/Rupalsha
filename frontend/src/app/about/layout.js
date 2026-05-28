// Server layout for /about — provides per-page SEO metadata so this
// route doesn't fall back to the root layout's homepage title.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com';

export const metadata = {
  title: 'About Rupalsha — Our Story & Promise',
  description:
    'Learn about Rupalsha — a modern jewellery brand crafting anti-tarnish, waterproof, skin-friendly pieces for everyday elegance.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'About Rupalsha — Our Story & Promise',
    description:
      'Learn about Rupalsha — a modern jewellery brand crafting anti-tarnish, waterproof, skin-friendly pieces for everyday elegance.',
    url: `${SITE_URL}/about`,
    type: 'website',
  },
};

export default function AboutLayout({ children }) {
  return children;
}
