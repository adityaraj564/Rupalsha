import { serverFetchSafe } from '@/lib/serverApi';
import PolicyArticle from '@/components/PolicyArticle';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com').replace(/\/$/, '');

export const revalidate = 600;

async function loadPage() {
  return serverFetchSafe('/pages/shipping', { revalidate: 600, tags: ['pages'] });
}

export async function generateMetadata() {
  const data = await loadPage();
  const title = data?.page?.title || 'Shipping Policy';
  return {
    title: `${title} | Rupalsha`,
    description:
      'Rupalsha shipping policy — delivery timelines, charges, courier partners and free-shipping thresholds for orders across India.',
    alternates: { canonical: `${SITE_URL}/shipping` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | Rupalsha`,
      description: 'Delivery timelines, charges and courier partners for Rupalsha orders.',
      url: `${SITE_URL}/shipping`,
      type: 'article',
    },
  };
}

export default async function ShippingPage() {
  const data = await loadPage();
  return <PolicyArticle page={data?.page} fallbackTitle="Shipping Policy" />;
}
