import './globals.css';
import { Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import AuthInit from '@/components/AuthInit';
import TopProgressBar from '@/components/TopProgressBar';

const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-5385129928466192';

export const metadata = {
  title: 'Rupalsha — Where Comfort Meets Style',
  description: 'Discover elegant ethnic and modern fashion at Rupalsha. Shop sarees, kurtis, lehengas, dresses and more. Premium quality, affordable luxury.',
  keywords: 'fashion, ethnic wear, sarees, kurtis, lehengas, dresses, women fashion, Indian fashion, Rupalsha',
  openGraph: {
    title: 'Rupalsha — Where Comfort Meets Style',
    description: 'Discover elegant ethnic and modern fashion at Rupalsha.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
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
      </head>
      <body className="min-h-screen flex flex-col bg-brand-cream dark:bg-gray-950 text-brand-charcoal dark:text-gray-100 transition-colors duration-300">
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
      </body>
    </html>
  );
}
