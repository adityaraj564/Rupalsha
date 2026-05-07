'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiMail, FiPhone, FiClock } from 'react-icons/fi';
import { faqsAPI, pagesAPI, settingsAPI } from '@/lib/api';
import { FiAlertTriangle } from 'react-icons/fi';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [shipping, setShipping] = useState(null);
  const [returns, setReturns] = useState(null);
  const [contact, setContact] = useState(null);
  const [privacy, setPrivacy] = useState(null);
  const [terms, setTerms] = useState(null);
  const [unboxingNoticeOn, setUnboxingNoticeOn] = useState(true);

  useEffect(() => {
    faqsAPI.getAll().then((d) => setFaqs(d.faqs || [])).catch(() => {});
    pagesAPI.get('shipping').then((d) => setShipping(d.page)).catch(() => {});
    pagesAPI.get('returns').then((d) => setReturns(d.page)).catch(() => {});
    pagesAPI.get('contact').then((d) => setContact(d.page)).catch(() => {});
    pagesAPI.get('privacy').then((d) => setPrivacy(d.page)).catch(() => {});
    pagesAPI.get('terms').then((d) => setTerms(d.page)).catch(() => {});
    settingsAPI.get()
      .then((s) => setUnboxingNoticeOn(s?.unboxingVideoNoticeEnabled !== false))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-white text-center mb-4">
        Help & Support
      </h1>
      <p className="text-gray-500 text-center mb-12">We&apos;re here to help you</p>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="mb-16">
          <h2 className="font-serif text-2xl font-semibold mb-6 dark:text-white">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={faq._id || i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-brand-charcoal dark:text-gray-100 pr-4">{faq.question}</span>
                  <FiChevronDown className={`flex-shrink-0 transition-transform text-gray-400 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-600 dark:text-gray-400 text-sm leading-relaxed animate-slide-down">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shipping Info */}
      {shipping && (
        <section id="shipping" className="mb-16">
          <h2 className="font-serif text-2xl font-semibold mb-4 dark:text-white">{shipping.title}</h2>
          <div className="card p-6 text-sm text-gray-600 dark:text-gray-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: shipping.content }} />
        </section>
      )}

      {/* Returns */}
      {returns && (
        <section id="returns" className="mb-16">
          <h2 className="font-serif text-2xl font-semibold mb-4 dark:text-white">{returns.title}</h2>
          <div
            className="card p-6 text-sm text-gray-600 dark:text-gray-400 prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              // Strip any legacy "Mandatory unboxing video" warning block that
              // may still live in older PageContent rows in the database, so
              // the softened notice below is the single source of truth.
              __html: (returns.content || '').replace(
                /<div class=["']warning["']>[\s\S]*?<\/div>/gi,
                ''
              ),
            }}
          />
          {/* Unboxing video guidance — always shown so customers see this
              helpful recommendation regardless of the legacy admin toggle. */}
          <div className="mt-4 rounded-xl border-2 border-orange-400 bg-orange-50 dark:bg-orange-950/30 p-5">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" size={20} />
              <div className="text-sm">
                <p className="font-semibold text-orange-700 dark:text-orange-300 mb-1">
                  Unboxing Video Guidance
                </p>
                <p className="text-orange-700/90 dark:text-orange-200/90 leading-relaxed">
                  For a smoother return or exchange process, we recommend recording an unboxing video while opening your package. This helps us verify any issues related to damaged, missing, or incorrect products.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Us */}
      {contact && (
        <section id="contact" className="mb-16">
          <h2 className="font-serif text-2xl font-semibold mb-6 dark:text-white">{contact.title}</h2>
          <div className="card p-6">
            {contact.content && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-6 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: contact.content }} />
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contact.contactEmail && (
                <a href={`mailto:${contact.contactEmail}`} className="flex items-center gap-3 p-4 rounded-xl bg-brand-cream/50 dark:bg-gray-800 hover:bg-brand-cream dark:hover:bg-gray-700 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center">
                    <FiMail className="text-brand-green" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email Us</p>
                    <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">{contact.contactEmail}</p>
                  </div>
                </a>
              )}
              {contact.contactPhone && (
                <a href={`tel:${contact.contactPhone.replace(/\s+/g, '')}`} className="flex items-center gap-3 p-4 rounded-xl bg-brand-cream/50 dark:bg-gray-800 hover:bg-brand-cream dark:hover:bg-gray-700 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center">
                    <FiPhone className="text-brand-green" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Call Us</p>
                    <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">{contact.contactPhone}</p>
                  </div>
                </a>
              )}
              {contact.supportHours && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-cream/50 dark:bg-gray-800">
                  <div className="w-10 h-10 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center">
                    <FiClock className="text-brand-green" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Support Hours</p>
                    <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">{contact.supportHours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Privacy & Terms */}
      {privacy && (
        <section id="privacy" className="mb-16">
          <h2 className="font-serif text-2xl font-semibold mb-4 dark:text-white">{privacy.title}</h2>
          <div className="card p-6 text-sm text-gray-600 dark:text-gray-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: privacy.content }} />
        </section>
      )}

      {terms && (
        <section id="terms">
          <h2 className="font-serif text-2xl font-semibold mb-4 dark:text-white">{terms.title}</h2>
          <div className="card p-6 text-sm text-gray-600 dark:text-gray-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: terms.content }} />
        </section>
      )}
    </div>
  );
}
