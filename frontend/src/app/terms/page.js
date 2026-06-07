import { serverFetchSafe } from '@/lib/serverApi';
import PolicyArticle from '@/components/PolicyArticle';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com').replace(/\/$/, '');

export const revalidate = 600;

async function loadPage() {
  return serverFetchSafe('/pages/terms', { revalidate: 600, tags: ['pages'] });
}

export async function generateMetadata() {
  const data = await loadPage();
  const title = data?.page?.title || 'Terms of Service';
  return {
    title: `${title} | Rupalsha`,
    description:
      'Read the Rupalsha Terms of Service — the rules and conditions that govern your use of our website and purchases.',
    alternates: { canonical: `${SITE_URL}/terms` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | Rupalsha`,
      description: 'Terms and conditions for using Rupalsha and buying our products.',
      url: `${SITE_URL}/terms`,
      type: 'article',
    },
  };
}

export default async function TermsPage() {
  const data = await loadPage();
  return <PolicyArticle page={data?.page} fallbackTitle="Terms of Service" />;
}
