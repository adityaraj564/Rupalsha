'use client';

import Link from 'next/link';
import { FiInstagram, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { usePathname } from 'next/navigation';

const HELP_LINKS = [
  { href: '/help', label: 'FAQ' },
  { href: '/help#contact', label: 'Contact Us' },
  { href: '/help#shipping', label: 'Shipping Info' },
  { href: '/help#returns', label: 'Returns & Exchange' },
  { href: '/about', label: 'About Us' },
];

const PAYMENT_METHODS = [
  { name: 'GPay', svg: (
    <svg viewBox="0 0 24 24" className="w-8 h-5" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>
  )},
  { name: 'PhonePe', svg: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.248 17.523h-2.27l-.002-5.19-2.976 5.19h-2.27l3.72-6.353H8.58V9.135h3.164V6.477h2.27v2.658h1.697v2.035h-1.697v6.353z"/></svg>
  )},
  { name: 'Visa', svg: (
    <svg viewBox="0 0 48 48" className="w-8 h-5" fill="currentColor"><path d="M18.5 30.9l2.4-14.8h3.8l-2.4 14.8h-3.8zm16.1-14.4c-.8-.3-2-.6-3.5-.6-3.9 0-6.6 2.1-6.6 5 0 2.2 2 3.4 3.5 4.1 1.5.7 2 1.2 2 1.9 0 1-.1.2 1.5-1.6 1.5 0 3-.5 3.8-.8l.6 2.9c-.9.4-2.6.7-4.4.7-4.6 0-7.8-2.4-7.8-6.2 0-4.9 4.4-6.3 7-6.6 1.7-.2 3.8.2 3.8 1.8 0 .5-.1 1.1-.2 1.5l-3.5.1.2-2.2zm7.7 9.3l1.5-3.9.8 3.9h-2.3zm4-9.7h-3c-.9 0-1.6.3-2 1.2l-5.7 13.6h4l.8-2.2h4.9l.5 2.2h3.5l-3-14.8zM11.3 16.1L7.4 26.6l-.4-2.1-1.4-7.2c-.2-1-.9-1.2-1.8-1.2H.1l-.1.3c1.4.4 3 .9 4 1.5l3.3 12.8h4l6.2-14.6h-4.2-.2z"/></svg>
  )},
  { name: 'Mastercard', svg: (
    <svg viewBox="0 0 24 24" className="w-6 h-5" fill="currentColor"><circle cx="9" cy="12" r="7" opacity=".8"/><circle cx="15" cy="12" r="7" opacity=".6"/></svg>
  )},
  { name: 'UPI', svg: (
    <svg viewBox="0 0 24 24" className="w-6 h-5" fill="currentColor"><path d="M12.806 2l5.054 8.755-3.591 6.218H9.731L6.14 10.755 11.194 2h1.612zm-1.612 0L6.14 10.755l3.591 6.218h4.538l3.591-6.218L12.806 2h-1.612z" opacity=".7"/><path d="M7.5 18h9v2l-4.5 2-4.5-2v-2z"/></svg>
  )},
  { name: 'Razorpay', svg: (
    <svg viewBox="0 0 24 24" className="w-6 h-5" fill="currentColor"><path d="M22.436 0l-11.91 7.083-1.174 4.898 5.59-3.305L8.613 24h3.122L22.436 0zM5.849 10.768l-4.463 8.303h3.122l2.857-5.324 2.086-1.099-.855 3.56H11.7l1.6-6.678-7.451 1.238z"/></svg>
  )},
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-brand-green text-white">
      <div className="w-full px-4 sm:px-6 lg:px-[50px] py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <h2 className="font-serif text-3xl font-bold text-white mb-4">RUPALSHA</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              Adorn Your Elegance. Discover handcrafted jewellery that tells your story —
              from timeless classics to modern masterpieces.
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="https://instagram.com/rupalsha.official"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                <FiInstagram size={18} />
              </a>
              <a
                href="mailto:support@rupalsha.com"
                className="w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                <FiMail size={18} />
              </a>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-4">We Accept</h3>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((pm) => (
                <div key={pm.name} className="flex flex-col items-center gap-1 bg-white/10 rounded-lg py-2.5 px-2">
                  <span className="text-white/80">{pm.svg}</span>
                  <span className="text-[10px] text-gray-300">{pm.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-4">Help</h3>
            <ul className="space-y-3">
              {HELP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-300 text-sm hover:text-brand-gold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <FiMail className="mt-0.5 flex-shrink-0" />
                <a href="mailto:support@rupalsha.com" className="hover:text-brand-gold transition-colors">support@rupalsha.com</a>
              </li>
              <li className="flex items-start gap-3">
                <FiPhone className="mt-0.5 flex-shrink-0" />
                <a href="tel:+917979804477" className="hover:text-brand-gold transition-colors">+91 79798 04477</a>
              </li>
              <li className="flex items-start gap-3">
                <FiMapPin className="mt-0.5 flex-shrink-0" />
                <span>India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-700 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Rupalsha. All rights reserved.</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <Link href="/help#privacy" className="hover:text-brand-gold transition-colors">Privacy Policy</Link>
            <Link href="/help#terms" className="hover:text-brand-gold transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
