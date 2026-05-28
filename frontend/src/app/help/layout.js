// Server layout for /help — provides per-page SEO metadata so this
// route doesn't fall back to the root layout's homepage title.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com';

export const metadata = {
  title: 'Help & Support — FAQs, Shipping, Returns | Rupalsha',
  description:
    'Get help with your Rupalsha order — frequently asked questions, shipping information, returns and exchange policy, and customer support contacts.',
  alternates: { canonical: `${SITE_URL}/help` },
  openGraph: {
    title: 'Help & Support — FAQs, Shipping, Returns | Rupalsha',
    description:
      'Get help with your Rupalsha order — FAQs, shipping, returns & support.',
    url: `${SITE_URL}/help`,
    type: 'website',
  },
};

export default function HelpLayout({ children }) {
  return children;
}
