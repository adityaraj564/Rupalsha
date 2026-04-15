'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowRight, FiTruck, FiRefreshCw, FiShield, FiHeart } from 'react-icons/fi';
import ProductCard from '@/components/ProductCard';
import { productsAPI } from '@/lib/api';

const CATEGORIES = [
  { name: 'Sarees', slug: 'sarees', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600', color: 'from-rose-900/60' },
  { name: 'Kurtis', slug: 'kurtis', image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600', color: 'from-emerald-900/60' },
  { name: 'Lehengas', slug: 'lehengas', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600', color: 'from-indigo-900/60' },
  { name: 'Dresses', slug: 'dresses', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600', color: 'from-amber-900/60' },
  { name: 'Accessories', slug: 'accessories', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600', color: 'from-purple-900/60' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    productsAPI.getAll({ featured: 'true', limit: 8 }).then((data) => setFeatured(data.products)).catch(() => {});
    productsAPI.getAll({ trending: 'true', limit: 8 }).then((data) => setTrending(data.products)).catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] md:min-h-[85vh] flex items-center bg-brand-cream overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600"
            alt="Fashion Hero"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-cream via-brand-cream/80 to-transparent" />
        </div>

        <div className="relative w-full px-4 sm:px-6 lg:px-[50px] py-20">
          <div className="max-w-2xl">
            <p className="text-brand-gold font-medium tracking-[0.3em] uppercase text-sm mb-4 animate-slide-up">
              New Collection 2026
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold text-brand-charcoal leading-tight mb-6">
              Where Comfort
              <br />
              Meets <span className="text-brand-green italic">Style</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">
              Discover our exquisite collection of ethnic and contemporary fashion.
              Crafted with love for the modern woman who embraces elegance.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link href="/products" className="btn-primary inline-flex items-center gap-2">
                Shop Now <FiArrowRight />
              </Link>
              <Link href="/products?featured=true" className="btn-secondary inline-flex items-center gap-2">
                View Collections
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="bg-white border-y border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-[50px] py-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { icon: FiTruck, title: 'Free Shipping', desc: 'Orders above ₹999' },
            { icon: FiRefreshCw, title: 'Easy Returns', desc: '7-day return policy' },
            { icon: FiShield, title: 'Secure Payment', desc: '100% secure checkout' },
            { icon: FiHeart, title: 'Premium Quality', desc: 'Handpicked fabrics' },
          ].map((feature) => (
            <div key={feature.title} className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-cream flex items-center justify-center flex-shrink-0">
                <feature.icon className="text-brand-green" size={20} />
              </div>
              <div>
                <p className="font-medium text-sm text-brand-charcoal">{feature.title}</p>
                <p className="text-xs text-gray-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-16 md:py-24 w-full px-4 sm:px-6 lg:px-[50px]">
        <h2 className="section-title">Shop by Category</h2>
        <p className="section-subtitle">Find your perfect style from our curated categories</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-10">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 640px) 50vw, 20vw"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.color} to-transparent`} />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-serif text-white text-xl font-semibold">{cat.name}</h3>
                <p className="text-white/70 text-sm mt-1 group-hover:text-brand-gold transition-colors">
                  Explore →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Collections */}
      {featured.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="w-full px-4 sm:px-6 lg:px-[50px]">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="section-title text-left">Featured Collection</h2>
                <p className="text-gray-500 mt-2">Handpicked styles for you</p>
              </div>
              <Link href="/products?featured=true" className="text-brand-green font-medium text-sm hover:underline hidden md:block">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featured.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Banner */}
      <section className="py-16 md:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-[50px]">
          <div className="relative rounded-3xl overflow-hidden bg-brand-green min-h-[400px] flex items-center">
            <div className="absolute inset-0 opacity-10">
              <Image
                src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200"
                alt="Pattern"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative px-8 md:px-16 py-16 max-w-xl">
              <p className="text-brand-gold text-sm font-medium tracking-widest uppercase mb-4">Special Offer</p>
              <h2 className="font-serif text-4xl md:text-5xl text-white font-bold leading-tight mb-4">
                Get 10% Off Your First Order
              </h2>
              <p className="text-gray-300 mb-8">
                Use code <span className="font-semibold text-brand-gold">RUP10</span> at checkout.
                Valid on all products.
              </p>
              <Link href="/products" className="btn-gold inline-flex items-center gap-2">
                Shop Now <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Products */}
      {trending.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="w-full px-4 sm:px-6 lg:px-[50px]">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="section-title text-left">Trending Now</h2>
                <p className="text-gray-500 mt-2">Most loved by our customers</p>
              </div>
              <Link href="/products?trending=true" className="text-brand-green font-medium text-sm hover:underline hidden md:block">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {trending.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Instagram Section */}
      <section className="py-16 md:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-[50px] text-center">
          <h2 className="section-title">Follow Us on Instagram</h2>
          <p className="section-subtitle">@rupalsha.official</p>
          <a
            href="https://instagram.com/rupalsha.official"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2 mt-8"
          >
            Follow @rupalsha.official
          </a>
        </div>
      </section>
    </div>
  );
}
