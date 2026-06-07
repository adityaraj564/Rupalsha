import { serverFetchSafe } from '@/lib/serverApi';
import PolicyArticle from '@/components/PolicyArticle';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com').replace(/\/$/, '');

export const revalidate = 600;

async function loadPage() {
  return serverFetchSafe('/pages/returns', { revalidate: 600, tags: ['pages'] });
}

export async function generateMetadata() {
  const data = await loadPage();
  const title = data?.page?.title || 'Returns & Refund Policy';
  return {
    title: `${title} | Rupalsha`,
    description:
      'Rupalsha returns, exchange and refund policy — return window, eligible items, process and timelines for refunds.',
    alternates: { canonical: `${SITE_URL}/returns` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | Rupalsha`,
      description: 'Return window, eligible items, process and refund timelines.',
      url: `${SITE_URL}/returns`,
      type: 'article',
    },
  };
}

export default async function ReturnsPage() {
  const data = await loadPage();
  return <PolicyArticle page={data?.page} fallbackTitle="Returns & Refund Policy" />;
}
