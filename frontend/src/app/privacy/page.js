import { serverFetchSafe } from '@/lib/serverApi';
import PolicyArticle from '@/components/PolicyArticle';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com').replace(/\/$/, '');

export const revalidate = 600;

async function loadPage() {
  return serverFetchSafe('/pages/privacy', { revalidate: 600, tags: ['pages'] });
}

export async function generateMetadata() {
  const data = await loadPage();
  const title = data?.page?.title || 'Privacy Policy';
  return {
    title: `${title} | Rupalsha`,
    description:
      'Read the Rupalsha Privacy Policy — how we collect, use and protect your personal data when you shop with us in India.',
    alternates: { canonical: `${SITE_URL}/privacy` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | Rupalsha`,
      description:
        'How Rupalsha collects, uses and protects your personal data.',
      url: `${SITE_URL}/privacy`,
      type: 'article',
    },
  };
}

export default async function PrivacyPage() {
  const data = await loadPage();
  return <PolicyArticle page={data?.page} fallbackTitle="Privacy Policy" />;
}
