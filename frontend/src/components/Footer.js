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
  { name: 'GPay', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg' },
  { name: 'PhonePe', logo: 'https://cdn.worldvectorlogo.com/logos/phonepe-1.svg' },
  { name: 'Visa', logo: 'https://cdn.worldvectorlogo.com/logos/visa-2.svg' },
  { name: 'Mastercard', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' },
  { name: 'UPI', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg' },
  { name: 'Razorpay', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg' },
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
                <div key={pm.name} className="flex items-center justify-center rounded-lg py-2.5 px-2 h-12" style={{ backgroundColor: '#ffffff' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pm.logo}
                    alt={pm.name}
                    className="object-contain w-auto max-h-7 max-w-[56px]"
                  />
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
