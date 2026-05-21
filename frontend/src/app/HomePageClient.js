'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowRight, FiTruck, FiRefreshCw, FiShield, FiHeart, FiChevronLeft, FiChevronRight, FiStar, FiAward, FiPackage, FiSmile, FiTag, FiGift, FiInstagram, FiHeadphones } from 'react-icons/fi';
import ProductCard from '@/components/ProductCard';
import AdBanner from '@/components/AdBanner';
import { HomeSectionSkeleton } from '@/components/Skeleton';
import { productsAPI, bannersAPI, categoriesAPI, pagesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const FEATURE_ICONS = {
  FiTruck, FiRefreshCw, FiShield, FiHeart, FiStar, FiAward, FiPackage, FiSmile, FiTag, FiGift, FiHeadphones,
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
    const applyBanners = (data) => {
      setBanners(data && data.length > 0 ? data : DEFAULT_BANNERS);
    };
    // Returns cached banners immediately AND triggers a background
    // revalidation; onFresh fires only when the server response actually
    // differs from the cached one, so admin uploads/edits appear without
    // a manual refresh.
    bannersAPI
      .getActive({ onFresh: applyBanners })
      .then(applyBanners)
      .catch(() => setBanners(DEFAULT_BANNERS));

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

    pagesAPI.getMany(['special-offer', 'home-features', 'home-marquee', 'footer-about']).then((data) => {
      const pages = data?.pages || {};
      if (pages['special-offer']) setSpecialOffer(pages['special-offer']);
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
    const extra = { hideOutOfStock: 'true' };
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
    <div
      className="no-copy animate-fade-in bg-white dark:bg-gray-950"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Auto-Slide Banner Carousel */}
      {banners.length > 0 && (
        <section className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-950">
          <div className="relative w-full h-[125vw] min-h-[500px] md:h-[38vw] md:min-h-[420px]">
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
                  {/*
                    Native <picture> element: the browser selects the right
                    source BEFORE first paint based on viewport width, so
                    there is zero JS-driven flash on phones. Cloudinary
                    pre-renders each variant at the correct aspect ratio
                    (1920x600 desktop, 750x1000 mobile) and we set
                    fetchpriority="high" on the first slide so it lands in
                    the LCP path. The img stretches via absolute inset to
                    fill the carousel slot — object-cover keeps the focal
                    point centered without distortion.
                  */}
                  <picture>
                    {banner.mobileImage?.url && (
                      <source
                        media="(max-width: 767px)"
                        srcSet={banner.mobileImage.url}
                      />
                    )}
                    <img
                      src={banner.image?.url}
                      alt={banner.title || 'Banner'}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading={index === 0 ? 'eager' : 'lazy'}
                      fetchpriority={index === 0 ? 'high' : 'auto'}
                      decoding="async"
                      draggable={false}
                    />
                  </picture>
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
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors shadow"
                  aria-label="Previous banner"
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  onClick={() => { setCurrentBanner((prev) => (prev + 1) % banners.length); startAutoSlide(); }}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors shadow"
                  aria-label="Next banner"
                >
                  <FiChevronRight size={16} />
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
            <div className="w-full bg-black text-white overflow-hidden py-1 md:py-1.5">
              <div className="flex animate-marquee whitespace-nowrap">
                {[...Array(2)].map((_, dup) => (
                  <div key={dup} className="flex shrink-0 items-center gap-12 px-6 text-xs md:text-sm font-medium tracking-wide">
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

      {/* Shop by Category */}
      {categories.length > 0 && (
      <section className="py-8 md:py-12 mx-auto px-4 sm:px-6 lg:px-20 xl:px-32">
        <h2 className="section-title">Shop by Category</h2>
        <p className="section-subtitle">Find the perfect piece from our curated collections</p>

        <CategoryCircleScroller categories={categories} />
      </section>
      )}

      {/* Features Bar */}
      {resolvedFeatures.length > 0 && (
      <section className="bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="mx-auto px-4 sm:px-6 lg:px-20 xl:px-32 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
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
      <div className="mx-auto px-4 sm:px-6 lg:px-20 xl:px-32 py-4">
        <AdBanner adSlot={process.env.NEXT_PUBLIC_AD_SLOT_1} format="horizontal" />
      </div>

      {/* Featured Collections */}
      {featured.length > 0 ? (
        <section className="pt-8 md:pt-12 pb-6 md:pb-12 bg-white dark:bg-gray-900 skeleton-to-content">
          <div className="mx-auto px-4 sm:px-6 lg:px-20 xl:px-32">
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
              {featured.slice(0, 8).map((product, i) => (
                <div key={product._id} className={i >= 4 ? 'hidden md:block' : ''}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-10">
              <Link
                href="/products?featured=true"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-black dark:border-white text-black dark:text-white text-sm font-semibold tracking-wider uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300"
              >
                View All
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <HomeSectionSkeleton />
      )}

      {/* Ad — After New Arrivals */}
      <div className="mx-auto px-4 sm:px-6 lg:px-20 xl:px-32 py-0 md:py-4">
        <AdBanner adSlot={process.env.NEXT_PUBLIC_AD_SLOT_2} format="horizontal" />
      </div>

      {/* Banner */}
      <section className="py-0 md:py-12">
        <div className="mx-auto md:px-4 sm:px-6 lg:px-20 xl:px-32 px-0">
          <div className="relative md:rounded-3xl overflow-hidden bg-brand-green h-[125vw] min-h-[500px] md:h-auto md:min-h-[400px] flex items-center">
            {/* Native <picture> so the browser picks the mobile portrait
                or desktop landscape image *before* paint. The wrapper is
                opacity-20 (background pattern), so the image style stays
                identical to the previous next/image version, just sized
                correctly per breakpoint. */}
            <div className="absolute inset-0 opacity-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <picture>
                {specialOffer?.offerImageMobile && (
                  <source media="(max-width: 767px)" srcSet={specialOffer.offerImageMobile} />
                )}
                <img
                  src={specialOffer?.offerImage || specialOffer?.offerImageMobile || '/defaults/banner-2.jpg'}
                  alt="Pattern"
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
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
        <section className="py-8 md:py-12 bg-white dark:bg-gray-900 skeleton-to-content">
          <div className="mx-auto px-4 sm:px-6 lg:px-20 xl:px-32">
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
              {trending.slice(0, 8).map((product, i) => (
                <div key={product._id} className={i >= 4 ? 'hidden md:block' : ''}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-10">
              <Link
                href="/products?trending=true"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-black dark:border-white text-black dark:text-white text-sm font-semibold tracking-wider uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300"
              >
                View All
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <HomeSectionSkeleton />
      )}

      {/* Instagram Section */}
      <section className="py-6 md:py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-20 xl:px-32 text-center">
          <h2 className="font-sans text-lg md:text-xl font-medium tracking-wide text-brand-charcoal dark:text-gray-100">Follow Us on Instagram</h2>
          <p className="font-sans text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">@rupalsha.official</p>

          <a
            href="https://instagram.com/rupalsha.official"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 mt-4 px-7 py-3.5 rounded-full bg-white text-brand-charcoal font-semibold text-sm md:text-base shadow-lg hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
          >
            <FiInstagram size={18} className="text-[#d62976] group-hover:rotate-[-8deg] transition-transform" />
            <span>Follow @rupalsha.official</span>
            <FiArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>
    </div>
  );
}

// Horizontally scrollable circular category list, centered when content fits.
function CategoryCircleScroller({ categories }) {
  const scrollerRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    updateOverflow();
    window.addEventListener('resize', updateOverflow);
    return () => window.removeEventListener('resize', updateOverflow);
  }, [updateOverflow, categories.length]);

  return (
    <div className="relative mt-8 md:mt-10 -mx-4 sm:-mx-6 lg:-mx-20 xl:-mx-32">
      <div
        ref={scrollerRef}
        className={`category-scroller flex gap-5 sm:gap-7 md:gap-9 overflow-x-auto scroll-smooth px-4 sm:px-6 lg:px-20 xl:px-32 pb-2 ${
          overflowing ? '' : 'justify-center'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/products?category=${cat.slug}`}
            className="group flex-shrink-0 flex flex-col items-center w-20 sm:w-24 md:w-28"
          >
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 group-hover:ring-brand-gold transition-all duration-300 shadow-sm group-hover:shadow-md">
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
              />
            </div>
            <span className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-brand-charcoal dark:text-gray-200 text-center line-clamp-2 leading-tight">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .category-scroller::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

