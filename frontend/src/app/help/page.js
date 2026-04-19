'use client';

import { useState } from 'react';
import { FiChevronDown, FiMail, FiPhone, FiSend } from 'react-icons/fi';
import { contactAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery takes 5-7 business days across India. Metro cities may receive orders in 3-5 days.',
  },
  {
    q: 'What is your return policy?',
    a: 'Our return policy varies from product to product — the return window (number of days) is mentioned on each product page. Products must be unused, unwashed, and with original tags attached. Intimates and accessories are non-returnable. Recording an unboxing video while opening the package is mandatory for all return claims.',
  },
  {
    q: 'How do I track my order?',
    a: 'Once your order is shipped, you will receive a tracking number via email and SMS. You can also track your order from the "My Orders" section.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards, net banking, and Cash on Delivery (COD).',
  },
  {
    q: 'Can I cancel my order?',
    a: 'Yes, you can cancel your order before it is shipped. Go to "My Orders" and click on "Cancel Order". Once shipped, the order cannot be cancelled.',
  },
  {
    q: 'How do I exchange a product?',
    a: 'Currently we offer returns only. You can return the product and place a new order for the desired item.',
  },
  {
    q: 'Are the product images accurate?',
    a: 'We try our best to present accurate colors and details. However, slight variations may occur due to screen settings and lighting during photography.',
  },
  {
    q: 'Do you offer COD?',
    a: 'Yes, Cash on Delivery is available across India for orders up to ₹10,000.',
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await contactAPI.send(contactForm);
      toast.success('Message sent! We will get back to you soon.');
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal text-center mb-4">
        Help & Support
      </h1>
      <p className="text-gray-500 text-center mb-12">We&apos;re here to help you</p>

      {/* FAQ */}
      <section className="mb-16">
        <h2 className="font-serif text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-brand-charcoal pr-4">{faq.q}</span>
                <FiChevronDown className={`flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed animate-slide-down">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Shipping Info */}
      <section id="shipping" className="mb-16">
        <h2 className="font-serif text-2xl font-semibold mb-4">Shipping Information</h2>
        <div className="card p-6 text-sm text-gray-600 space-y-3">
          <p>We ship across India via trusted courier partners.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Standard delivery: 5-7 business days</li>
            <li>Metro cities: 3-5 business days</li>
            <li>Free shipping on orders above ₹999</li>
            <li>Flat ₹79 shipping fee on smaller orders</li>
          </ul>
        </div>
      </section>

      {/* Returns */}
      <section id="returns" className="mb-16">
        <h2 className="font-serif text-2xl font-semibold mb-4">Returns & Exchange</h2>
        <div className="card p-6 text-sm text-gray-600 space-y-3">
          <p>We want you to love what you buy. If not, returns are easy!</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Return window varies per product (check the product page for exact days)</li>
            <li>Products must be unused with original tags</li>
            <li>Refund processed within 5-7 business days</li>
            <li>Intimates and accessories are non-returnable</li>
          </ul>
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="font-semibold text-orange-700">⚠️ Mandatory: Unboxing Video Required</p>
            <p className="text-orange-600 mt-1">You must record a video while opening your package. This unboxing video is mandatory for processing any return or exchange request. Claims without an unboxing video will not be accepted.</p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="mb-16">
        <h2 className="font-serif text-2xl font-semibold mb-6">Contact Us</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center">
                  <FiMail className="text-brand-green" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">support@rupalsha.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center">
                  <FiPhone className="text-brand-green" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">+91 79798 04477</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Our support team is available Monday to Saturday, 10 AM to 6 PM IST.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              className="input-field"
              required
            />
            <input
              type="email"
              placeholder="Your Email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Subject"
              value={contactForm.subject}
              onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              className="input-field"
              required
            />
            <textarea
              placeholder="Your Message"
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              className="input-field"
              rows={4}
              required
            />
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={sending}>
              <FiSend size={16} /> {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>

      {/* Privacy & Terms */}
      <section id="privacy" className="mb-16">
        <h2 className="font-serif text-2xl font-semibold mb-4">Privacy Policy</h2>
        <div className="card p-6 text-sm text-gray-600 space-y-3">
          <p>We respect your privacy and are committed to protecting your personal data.</p>
          <p>We collect only necessary information for order processing and improving your experience. Your data is never sold to third parties.</p>
        </div>
      </section>

      <section id="terms">
        <h2 className="font-serif text-2xl font-semibold mb-4">Terms of Service</h2>
        <div className="card p-6 text-sm text-gray-600 space-y-3">
          <p>By using Rupalsha, you agree to our terms of service.</p>
          <p>All products are subject to availability. Prices are in INR and inclusive of taxes. For complete terms, please contact our support team.</p>
        </div>
      </section>
    </div>
  );
}
