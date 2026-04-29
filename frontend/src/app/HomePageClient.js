'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowRight, FiTruck, FiRefreshCw, FiShield, FiHeart, FiChevronLeft, FiChevronRight, FiStar, FiAward, FiPackage, FiSmile, FiTag, FiGift } from 'react-icons/fi';
import ProductCard from '@/components/ProductCard';
import AdBanner from '@/components/AdBanner';
import { HomeSectionSkeleton } from '@/components/Skeleton';
import { productsAPI, bannersAPI, categoriesAPI, pagesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const FEATURE_ICONS = {
  FiTruck, FiRefreshCw, FiShield, FiHeart, FiStar, FiAward, FiPackage, FiSmile, FiTag, FiGift,
};

const DEFAULT_FEATURES = [
  { icon: 'FiTruck', title: 'Faster Delivery', desc: 'Quick & reliable shipping' },
  { icon: 'FiRefreshCw', title: 'Easy Returns', desc: 'Hassle-free returns' },
  { icon: 'FiShield', title: 'Certified Jewellery', desc: 'Quality guaranteed' },
  { icon: 'FiHeart', title: 'Handcrafted', desc: 'Made with love' },
];

const DEFAULT_CATEGORY_IMAGES = {
  necklaces: '/defaults/cat-necklaces.jpg',
  earrings: '/defaults/cat-earrings.jpg',
  bangles: '/defaults/cat-bangles.jpg',
  rings: '/defaults/cat-rings.jpg',
  anklets: '/defaults/cat-anklets.jpg',
};

const GRADIENT_COLORS = [
  'from-rose-900/60',
  'from-amber-900/60',
  'from-emerald-900/60',
  'from-indigo-900/60',
  'from-purple-900/60',
  'from-teal-900/60',
  'from-pink-900/60',
  'from-cyan-900/60',
];

const DEFAULT_BANNERS = [
  { _id: 'default-1', image: { url: '/defaults/banner-1.jpg' }, title: 'Exquisite Gold Collection', link: '/products?featured=true' },
  { _id: 'default-2', image: { url: '/defaults/banner-2.jpg' }, title: 'New Bangle Arrivals', link: '/products?category=bangles' },
  { _id: 'default-3', image: { url: '/defaults/banner-3.jpg' }, title: 'Handcrafted Earrings for Every Occasion', link: '/products?category=earrings' },
];

export default function HomePageClient({
  initialBanners = [],
  initialCategories = [],
  initialFeatured = [],
  initialTrending = [],
  initialSpecialOffer = null,
  initialHero = null,
  initialFeatures = DEFAULT_FEATURES,
  initialMarqueeItems = [
    '✦ Free Shipping on Orders Above ₹999',
    '✦ Hallmark Certified Jewellery',
    '✦ Easy 7-Day Returns',
    '✦ New Arrivals Every Week',
    '✦ Cash on Delivery Available',
  ],
} = {}) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [trending, setTrending] = useState(initialTrending);
  const [banners, setBanners] = useState(initialBanners.length > 0 ? initialBanners : DEFAULT_BANNERS);
  const [categories, setCategories] = useState(initialCategories);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [specialOffer, setSpecialOffer] = useState(initialSpecialOffer);
  const [hero, setHero] = useState(initialHero);
  const [features, setFeatures] = useState(initialFeatures);
  const [marqueeItems, setMarqueeItems] = useState(initialMarqueeItems);
  const bannerInterval = useRef(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Resolve icon components once per features array change to avoid
  // re-creating render objects on every parent re-render.
  const resolvedFeatures = useMemo(
    () => features.map((f) => ({
      key: `${f.title}-${f.desc}`,
      Icon: FEATURE_ICONS[f.icon] || FiTruck,
      title: f.title,
      desc: f.desc,
    })),
    [features]
  );

  // Auto-slide banners
  const startAutoSlide = useCallback(() => {
    if (bannerInterval.current) clearInterval(bannerInterval.current);
    bannerInterval.current = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % (banners.length || 1));
    }, 2500);
  }, [banners.length]);

  useEffect(() => {
    bannersAPI.getActive().then((data) => {
      setBanners(data && data.length > 0 ? data : DEFAULT_BANNERS);
    }).catch(() => setBanners(DEFAULT_BANNERS));

    categoriesAPI.getTree().then((data) => {
      if (data?.categories?.length > 0) {
        setCategories(data.categories.map((cat, i) => ({
          name: cat.name,
          slug: cat.slug,
          image: cat.image?.url || DEFAULT_CATEGORY_IMAGES[cat.slug] || `/defaults/cat-${cat.slug}.jpg`,
          color: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
        })));
      }
    }).catch(() => {});

    pagesAPI.getMany(['special-offer', 'home-hero', 'home-features', 'home-marquee', 'footer-about']).then((data) => {
      const pages = data?.pages || {};
      if (pages['special-offer']) setSpecialOffer(pages['special-offer']);
      if (pages['home-hero']) setHero(pages['home-hero']);
      if (pages['home-features']?.features?.length) setFeatures(pages['home-features'].features);
      if (pages['home-marquee']?.content) {
        const items = String(pages['home-marquee'].content)
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
        if (items.length > 0) setMarqueeItems(items);
      }
      // 'footer-about' is intentionally fetched here too so the Footer's
      // own pagesAPI.get('footer-about') call becomes a cache hit.
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      startAutoSlide();
      return () => clearInterval(bannerInterval.current);
    }
  }, [banners.length, startAutoSlide]);

  useEffect(() => {
    const extra = !isAuthenticated ? { hideOutOfStock: 'true' } : {};
    const loadProducts = async () => {
      try {
        // Background-revalidating fetch with onFresh hook so stock changes
        // surface within one round-trip without any extra refresh logic.
        const [featuredData, trendingData] = await Promise.all([
          productsAPI.getAll({ featured: 'true', limit: 8, ...extra }, {
            onFresh: (data) => { if (data?.products) setFeatured(data.products); },
          }),
          productsAPI.getAll({ trending: 'true', limit: 8, ...extra }, {
            onFresh: (data) => { if (data?.products) setTrending(data.products); },
          }),
        ]);
        setFeatured(featuredData.products);
        setTrending(trendingData.products);
      } catch {
        // Retry once more after 3s if both failed
        if (featured.length === 0 && trending.length === 0) {
          setTimeout(() => {
            productsAPI.getAll({ featured: 'true', limit: 8, ...extra }).then((d) => setFeatured(d.products)).catch(() => {});
            productsAPI.getAll({ trending: 'true', limit: 8, ...extra }).then((d) => setTrending(d.products)).catch(() => {});
          }, 3000);
        }
      }
    };
    loadProducts();
  }, [isAuthenticated]);

  return (
    <div className="animate-fade-in hexagon-bg">
      {/* Auto-Slide Banner Carousel */}
      {banners.length > 0 && (
        <section className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-950">
          <div className="relative w-full h-[125vw] min-h-[500px] md:h-[30vw] md:min-h-[320px]">
            {banners.map((banner, index) => {
              const Wrapper = banner.link ? Link : 'div';
              const wrapperProps = banner.link ? { href: banner.link } : {};
              return (
                <Wrapper
                  key={banner._id}
                  {...wrapperProps}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                >
                  <Image
                    src={banner.image?.url}
                    alt={banner.title || 'Banner'}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={index === 0}
                  />
                  {banner.title && (
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/40 to-transparent">
                      <p className="text-white text-lg md:text-2xl font-serif font-semibold px-6 md:px-12 pb-6 md:pb-10">
                        {banner.title}
                      </p>
                    </div>
                  )}
                </Wrapper>
              );
            })}

            {banners.length > 1 && (
              <>
                <button
                  onClick={() => { setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length); startAutoSlide(); }}
                  className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 dark:bg-black/50 flex items-center justify-center text-brand-charcoal dark:text-white hover:bg-white transition-colors shadow"
                  aria-label="Previous banner"
                >
                  <FiChevronLeft size={20} />
                </button>
                <button
                  onClick={() => { setCurrentBanner((prev) => (prev + 1) % banners.length); startAutoSlide(); }}
                  className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 dark:bg-black/50 flex items-center justify-center text-brand-charcoal dark:text-white hover:bg-white transition-colors shadow"
                  aria-label="Next banner"
                >
                  <FiChevronRight size={20} />
                </button>
              </>
            )}

            {banners.length > 1 && (
              <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentBanner(i); startAutoSlide(); }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === currentBanner ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Go to banner ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Scrolling announcement strip (right-to-left) */}
          {marqueeItems.length > 0 && (
            <div className="w-full bg-black text-white overflow-hidden py-2 md:py-3">
              <div className="flex animate-marquee whitespace-nowrap">
                {[...Array(2)].map((_, dup) => (
                  <div key={dup} className="flex shrink-0 items-center gap-12 px-6 text-sm md:text-base font-medium tracking-wide">
                    {marqueeItems.map((item, i) => (
                      <span key={i}>{item}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center bg-brand-cream dark:bg-gray-950 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/defaults/banner-1.jpg"
            alt="Jewellery Hero"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-cream via-brand-cream/80 to-transparent dark:from-gray-950 dark:via-gray-950/80" />
        </div>

        <div className="relative mx-auto px-4 sm:px-6 lg:px-[50px] py-10 md:py-20">
          <div className="max-w-2xl">
            <p className="text-brand-gold font-medium tracking-[0.3em] uppercase text-sm mb-4 animate-slide-up">
              {hero?.heroEyebrow || 'Exquisite Jewellery Collection'}
            </p>
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-brand-charcoal dark:text-gray-100 leading-tight mb-6">
              {hero?.heroTitle || 'Adorn Your'}
              <br />
              <span className="text-brand-gold italic">{hero?.heroAccent || 'Elegance'}</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg leading-relaxed">
              {hero?.content || 'Discover handcrafted jewellery that tells your story. From timeless classics to modern masterpieces — crafted with love.'}
            </p>
            <div className="flex flex-wrap gap-4">
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
      {resolvedFeatures.length > 0 && (
      <section className="bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="mx-auto px-4 sm:px-6 lg:px-[50px] py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {resolvedFeatures.map(({ key, Icon, title, desc }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-cream flex items-center justify-center flex-shrink-0">
                <Icon className="text-brand-green" size={20} />
              </div>
              <div>
                <p className="font-medium text-sm text-brand-charcoal dark:text-gray-200">{title}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Ad — After Features */}
      <div className="mx-auto px-4 sm:px-6 lg:px-[50px] py-4">
        <AdBanner adSlot={process.env.NEXT_PUBLIC_AD_SLOT_1} format="horizontal" />
      </div>

      {/* Shop by Category */}
      {categories.length > 0 && (
      <section className="py-16 md:py-24 mx-auto px-4 sm:px-6 lg:px-[50px]">
        <h2 className="section-title">Shop by Category</h2>
        <p className="section-subtitle">Find the perfect piece from our curated collections</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-10">
          {categories.map((cat) => (
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
      )}

      {/* Featured Collections */}
      {featured.length > 0 ? (
        <section className="py-16 md:py-24 bg-white dark:bg-gray-900 skeleton-to-content">
          <div className="mx-auto px-4 sm:px-6 lg:px-[50px]">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="section-title text-left">New Arrivals</h2>
                <p className="text-gray-500 mt-2">Handpicked pieces for you</p>
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
      ) : (
        <HomeSectionSkeleton />
      )}

      {/* Ad — After New Arrivals */}
      <div className="mx-auto px-4 sm:px-6 lg:px-[50px] py-4">
        <AdBanner adSlot={process.env.NEXT_PUBLIC_AD_SLOT_2} format="horizontal" />
      </div>

      {/* Banner */}
      <section className="py-16 md:py-24">
        <div className="mx-auto px-4 sm:px-6 lg:px-[50px]">
          <div className="relative rounded-3xl overflow-hidden bg-brand-green min-h-[400px] flex items-center">
            <div className="absolute inset-0 opacity-20">
              <Image
                src={specialOffer?.offerImage || '/defaults/banner-2.jpg'}
                alt="Pattern"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative px-8 md:px-16 py-16 max-w-xl">
              <p className="text-brand-gold text-sm font-medium tracking-widest uppercase mb-4">{specialOffer?.title || 'Special Offer'}</p>
              <h2 className="font-serif text-4xl md:text-5xl text-white font-bold leading-tight mb-4">
                {specialOffer?.offerHeading || 'Get 10% Off Your First Order'}
              </h2>
              <p className="text-gray-300 mb-8">
                Use code <span className="font-semibold text-brand-gold">{specialOffer?.offerCode || 'RUP10'}</span> {specialOffer?.offerDescription || 'at checkout'}.
                {' '}{specialOffer?.content || 'Valid on all products.'}
              </p>
              <Link href={specialOffer?.offerLink || '/products'} className="btn-gold inline-flex items-center gap-2">
                Shop Now <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Products */}
      {trending.length > 0 ? (
        <section className="py-16 md:py-24 bg-white dark:bg-gray-900 skeleton-to-content">
          <div className="mx-auto px-4 sm:px-6 lg:px-[50px]">
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
      ) : (
        <HomeSectionSkeleton />
      )}

      {/* Instagram Section */}
      <section className="py-16 md:py-24">
        <div className="mx-auto px-4 sm:px-6 lg:px-[50px] text-center">
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
