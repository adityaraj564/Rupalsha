'use client';

import Link from 'next/link';
import { FiInstagram, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { usePathname } from 'next/navigation';

const CATEGORIES = [
  { href: '/products?category=sarees', label: 'Sarees' },
  { href: '/products?category=kurtis', label: 'Kurtis' },
  { href: '/products?category=lehengas', label: 'Lehengas' },
  { href: '/products?category=dresses', label: 'Dresses' },
  { href: '/products?category=accessories', label: 'Accessories' },
];

const HELP_LINKS = [
  { href: '/help', label: 'FAQ' },
  { href: '/help#contact', label: 'Contact Us' },
  { href: '/help#shipping', label: 'Shipping Info' },
  { href: '/help#returns', label: 'Returns & Exchange' },
  { href: '/about', label: 'About Us' },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-brand-green text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <h2 className="font-serif text-3xl font-bold text-white mb-4">RUPALSHA</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              Where Comfort Meets Style. Discover an exquisite collection of ethnic and modern fashion,
              crafted with love for the contemporary woman.
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
                href="mailto:hello@rupalsha.com"
                className="w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                <FiMail size={18} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-4">Shop</h3>
            <ul className="space-y-3">
              {CATEGORIES.map((cat) => (
                <li key={cat.href}>
                  <Link href={cat.href} className="text-gray-300 text-sm hover:text-brand-gold transition-colors">
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
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
                <span>rupalshaofficial@gmail.com</span>
              </li>
              <li className="flex items-start gap-3">
                <FiPhone className="mt-0.5 flex-shrink-0" />
                <span>+91 79798 04477</span>
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
