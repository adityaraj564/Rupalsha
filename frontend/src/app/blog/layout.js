// Server layout for /blog — provides per-page SEO metadata for the blog
// listing so this route doesn't fall back to the root layout's homepage
// title. Individual blog posts override these via their own layout.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com';

export const metadata = {
  title: 'Rupalsha Blog — Jewellery Care, Trends & Stories',
  description:
    'Tips on jewellery care, styling guides, trends and stories from the Rupalsha studio.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'Rupalsha Blog — Jewellery Care, Trends & Stories',
    description:
      'Tips on jewellery care, styling guides, trends and stories from the Rupalsha studio.',
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
};

export default function BlogLayout({ children }) {
  return children;
}
