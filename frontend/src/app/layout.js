import './globals.css';
import { Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import AuthInit from '@/components/AuthInit';
import AuthModal from '@/components/AuthModal';
import LoginPrompt from '@/components/LoginPrompt';
import TopProgressBar from '@/components/TopProgressBar';
import PWAInstallPopup from '@/components/PWAInstallPopup';
import { serverFetchSafe } from '@/lib/serverApi';

const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-5385129928466192';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com';
const SITE_NAME = 'Rupalsha';
const SITE_DESCRIPTION = 'Discover elegant ethnic and modern fashion at Rupalsha. Shop sarees, kurtis, lehengas, dresses and more. Premium quality, affordable luxury.';
const LOGO_URL = `${SITE_URL}/Rupalsha.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Rupalsha — Where Comfort Meets Style',
    template: '%s | Rupalsha',
  },
  description: SITE_DESCRIPTION,
  keywords: 'fashion, ethnic wear, sarees, kurtis, lehengas, dresses, women fashion, Indian fashion, Rupalsha',
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: '/Rupalsha.png', type: 'image/png' },
    ],
    shortcut: ['/Rupalsha.png'],
    apple: [{ url: '/Rupalsha.png' }],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Rupalsha — Where Comfort Meets Style',
    description: SITE_DESCRIPTION,
    images: [{ url: LOGO_URL, width: 512, height: 512, alt: 'Rupalsha' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rupalsha — Where Comfort Meets Style',
    description: SITE_DESCRIPTION,
    images: [LOGO_URL],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// Site is highly dynamic (auth, cart, search params in Header) — opt out of
// static prerendering at the root so Next.js doesn't error on useSearchParams
// during the Vercel build, and avoids dev-mode hydration mismatches.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }) {
  // Server-fetch the free-shipping threshold so the first paint already
  // shows the admin-configured value (e.g. ₹599) instead of flashing the
  // hardcoded fallback ₹999 for a moment before the client hook resolves.
  const settings = await serverFetchSafe('/settings', { revalidate: 30 });
  const freeShippingThreshold = Number(settings?.freeShippingThreshold);
  const seededThreshold = Number.isFinite(freeShippingThreshold) && freeShippingThreshold >= 0
    ? freeShippingThreshold
    : 999;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rupalsha_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap"
          rel="stylesheet"
        />
        {/* Google AdSense — server-rendered so the AdSense crawler can verify the site.
            Auto Ads behavior (including page-level exclusions for /auth, /checkout, /admin, etc.)
            is controlled from the AdSense dashboard. We do NOT modify AdSense code. */}
        <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
        {/* Structured data — helps Google show the logo & sitelinks search box. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${SITE_URL}/#organization`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  logo: {
                    '@type': 'ImageObject',
                    url: LOGO_URL,
                    width: 512,
                    height: 512,
                  },
                  sameAs: [
                    'https://instagram.com/rupalsha.official',
                  ],
                },
                {
                  '@type': 'WebSite',
                  '@id': `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: SITE_NAME,
                  description: SITE_DESCRIPTION,
                  publisher: { '@id': `${SITE_URL}/#organization` },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-brand-cream dark:bg-gray-950 text-brand-charcoal dark:text-gray-100 transition-colors duration-300">
        {/* Seed the free-shipping threshold before any client component renders
            so useFreeShippingThreshold() returns the real value on first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__FREE_SHIPPING_THRESHOLD__=${seededThreshold};`,
          }}
        />
        <TopProgressBar />
        <AuthInit />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#0E2A22',
              color: '#fff',
              borderRadius: '50px',
              padding: '12px 24px',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppFloat />
        <AuthModal />
        <LoginPrompt />
        <PWAInstallPopup />
      </body>
    </html>
  );
}
