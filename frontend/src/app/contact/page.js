import { FiMail, FiPhone, FiMapPin, FiClock, FiInstagram, FiYoutube } from 'react-icons/fi';
import { serverFetchSafe } from '@/lib/serverApi';
import ContactForm from '@/components/ContactForm';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com').replace(/\/$/, '');

export const revalidate = 600;

async function loadData() {
  const [pageRes, settingsRes] = await Promise.all([
    serverFetchSafe('/pages/contact', { revalidate: 600, tags: ['pages'] }),
    serverFetchSafe('/settings', { revalidate: 600, tags: ['settings'] }),
  ]);
  return { page: pageRes?.page || null, settings: settingsRes || null };
}

export async function generateMetadata() {
  return {
    title: 'Contact Us | Rupalsha',
    description:
      'Get in touch with Rupalsha — email, phone, business address and support hours. We respond to every customer enquiry within one business day.',
    alternates: { canonical: `${SITE_URL}/contact` },
    robots: { index: true, follow: true },
    openGraph: {
      title: 'Contact Us | Rupalsha',
      description: 'Reach the Rupalsha team by email, phone or the contact form.',
      url: `${SITE_URL}/contact`,
      type: 'website',
    },
  };
}

export default async function ContactPage() {
  const { page, settings } = await loadData();

  const email = page?.contactEmail || 'support@rupalsha.com';
  const phone = page?.contactPhone || '+91 92885 25685';
  const hours = page?.supportHours || 'Monday to Saturday, 10 AM to 6 PM IST';
  const address = settings?.businessAddress || '';

  // Structured data — helps Google associate this URL with the business
  // and is one of the explicit Merchant Center recommendations.
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Rupalsha',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email,
        telephone: phone,
        areaServed: 'IN',
        availableLanguage: ['en', 'hi'],
      },
    ],
    sameAs: [
      'https://instagram.com/rupalsha.official',
      'https://www.youtube.com/@RupalshaJourney',
    ],
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 animate-fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />

      <header className="text-center mb-10">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-white">
          {page?.title || 'Contact Us'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
          We&apos;d love to hear from you. Reach out for product questions, order help
          or anything else — we usually reply within one business day.
        </p>
      </header>

      {page?.content && (
        <div
          className="card p-6 sm:p-8 mb-8 text-sm sm:text-base text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Direct contact details */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-brand-charcoal dark:text-white mb-1">
            Reach us directly
          </h2>

          <a
            href={`mailto:${email}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-brand-cream/50 dark:bg-gray-800 hover:bg-brand-cream dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center">
              <FiMail className="text-brand-green" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">{email}</p>
            </div>
          </a>

          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-brand-cream/50 dark:bg-gray-800 hover:bg-brand-cream dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center">
              <FiPhone className="text-brand-green" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">{phone}</p>
            </div>
          </a>

          {address && (
            <div className="flex items-start gap-4 p-4 rounded-xl bg-brand-cream/50 dark:bg-gray-800">
              <div className="w-11 h-11 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                <FiMapPin className="text-brand-green" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Business address</p>
                <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm whitespace-pre-line">
                  {address}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4 p-4 rounded-xl bg-brand-cream/50 dark:bg-gray-800">
            <div className="w-11 h-11 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center flex-shrink-0">
              <FiClock className="text-brand-green" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Support hours</p>
              <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">{hours}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <a
              href="https://instagram.com/rupalsha.official"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-brand-green hover:text-brand-green transition-colors"
            >
              <FiInstagram size={18} />
            </a>
            <a
              href="https://www.youtube.com/@RupalshaJourney"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-brand-green hover:text-brand-green transition-colors"
            >
              <FiYoutube size={18} />
            </a>
          </div>
        </div>

        {/* Contact form */}
        <ContactForm />
      </div>
    </div>
  );
}
