'use client';

import Link from 'next/link';
import { FiImage, FiHelpCircle, FiFileText, FiInfo, FiFile } from 'react-icons/fi';

const CARDS = [
  { href: '/content-admin/banners', label: 'Banners', desc: 'Manage homepage banners', icon: FiImage, color: 'bg-blue-500' },
  { href: '/content-admin/faqs', label: 'FAQ', desc: 'Manage frequently asked questions', icon: FiHelpCircle, color: 'bg-green-500' },
  { href: '/content-admin/pages', label: 'Page Content', desc: 'Edit Contact, Shipping, Returns info', icon: FiFile, color: 'bg-purple-500' },
  { href: '/content-admin/blogs', label: 'Blog Posts', desc: 'Create and manage blog articles', icon: FiFileText, color: 'bg-orange-500' },
  { href: '/content-admin/about', label: 'About Us', desc: 'Edit About Us page content', icon: FiInfo, color: 'bg-pink-500' },
];

export default function ContentAdminDashboard() {
  return (
    <div>
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-charcoal dark:text-white mb-2">
        Content Admin Dashboard
      </h1>
      <p className="text-gray-500 mb-8">Manage content and pages for Rupalsha</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all group"
          >
            <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform`}>
              <card.icon size={24} />
            </div>
            <h3 className="font-semibold text-brand-charcoal dark:text-white mb-1">{card.label}</h3>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
