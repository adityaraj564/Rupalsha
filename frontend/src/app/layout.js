import './globals.css';
import { Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthInit from '@/components/AuthInit';

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
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthInit />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1F3A2F',
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
      </body>
    </html>
  );
}
