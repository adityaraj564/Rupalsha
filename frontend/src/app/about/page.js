'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { aboutAPI } from '@/lib/api';
import { AboutSkeleton } from '@/components/Skeleton';
import {
  FiAward, FiHeart, FiTruck, FiShield, FiStar, FiPackage,
  FiGift, FiCheckCircle, FiSmile, FiTag,
} from 'react-icons/fi';

/**
 * About — minimal, editorial, credibility-first.
 *
 * No "founded year", "years in business", or "team count" anywhere —
 * a young boutique gains nothing by advertising its age. Instead we
 * highlight customer-side promises every fine jeweller can make.
 *
 * Every piece of copy on this page is admin-editable: tagline, story,
 * mission, vision, team and the promise chips below the hero are all
 * sourced from the About document via /api/about.
 */

// Whitelist of icon keys the admin can pick for a promise chip. Keep
// this map in sync with the <select> options in the admin panel
// (frontend/src/app/admin/about/page.js).
const PROMISE_ICONS = {
  award: FiAward,
  heart: FiHeart,
  truck: FiTruck,
  shield: FiShield,
  star: FiStar,
  package: FiPackage,
  gift: FiGift,
  check: FiCheckCircle,
  smile: FiSmile,
  tag: FiTag,
};

export default function AboutPage() {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aboutAPI.get()
      .then((d) => setAbout(d.about))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AboutSkeleton />;
  if (!about) {
    return (
      <div className="text-center py-20 text-gray-500">
        About information not available.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-brand-gold/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-green/10 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-32 pb-12 md:pb-16 text-center">
          <span className="inline-block text-xs uppercase tracking-[0.25em] text-brand-gold font-medium">
            About {about.companyName}
          </span>
          <h1 className="font-serif mt-4 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight text-brand-charcoal dark:text-gray-100">
            {about.tagline || 'Quiet luxury, hand-picked for you.'}
          </h1>
          <div className="mt-6 mx-auto h-px w-16 bg-brand-gold/60" />
        </div>

        {/* Full-bleed banner. We deliberately drop the max-w container,
            rounded corners, and outer padding so the cover image lives
            edge-to-edge — a cinematic moment that opens the page.

            Aspect ratios:
              - phone (portrait): aspect-[4/5] when a mobile image is
                uploaded, so the dedicated mobile asset shows in full.
                Falls back to 16/9 when only the desktop image exists.
              - tablet/desktop: 21/9 → 24/9, keeping it cinematic
                without becoming a wall of pixels on huge monitors.

            We render with a native <picture> so the browser picks the
            mobile or desktop file *before* paint — there's no JS
            viewport check, no flicker, no double-download. */}
        <div
          className={`relative w-full ${about.coverImageMobile?.url ? 'aspect-[4/5]' : 'aspect-[16/9]'} sm:aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9] min-h-[220px] md:min-h-[320px] lg:min-h-[360px] overflow-hidden bg-brand-cream dark:bg-gray-900`}
        >
          {about.coverImage?.url || about.coverImageMobile?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <picture>
              {about.coverImageMobile?.url && (
                <source media="(max-width: 767px)" srcSet={about.coverImageMobile.url} />
              )}
              <img
                src={about.coverImage?.url || about.coverImageMobile?.url}
                alt={about.companyName}
                className="absolute inset-0 w-full h-full object-cover"
                fetchpriority="high"
                decoding="async"
              />
            </picture>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-4xl md:text-6xl text-brand-green/20 dark:text-brand-gold/30 tracking-wide">
                {about.companyName}
              </span>
              <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand-gold/15 blur-3xl" aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-brand-green/10 blur-3xl" aria-hidden="true" />
            </div>
          )}
          {/* Soft bottom fade so the page below blends in without a
              hard horizontal seam. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white dark:to-gray-950" aria-hidden="true" />
        </div>
      </section>

      {/* ── Promises (admin-editable, hidden if empty) ────────── */}
      {about.promises?.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16 md:mt-24">
          {/* Flex-wrap with justify-center so any count (1, 2, 3 or 4)
              sits centred as a group instead of left-aligning when
              there are fewer chips than columns. Each chip has a
              sensible min-width so they line up neatly side-by-side. */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {about.promises.map((p, i) => {
              const Icon = PROMISE_ICONS[p.icon] || FiAward;
              return (
                <div
                  key={`${p.label}-${i}`}
                  className="flex items-center gap-3 rounded-2xl bg-brand-cream/50 dark:bg-gray-900 ring-1 ring-gray-100 dark:ring-gray-800 px-4 py-3 min-w-[150px] md:min-w-[210px]"
                >
                  <Icon className="text-brand-gold shrink-0" size={18} />
                  <span className="text-xs md:text-sm font-medium text-brand-charcoal dark:text-gray-200">
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Story ─────────────────────────────────────────────────── */}
      {about.story && (
        <section className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100 text-center">
            Our story
          </h2>
          <div className="mt-4 mx-auto h-px w-12 bg-brand-gold/60" />
          <p className="mt-10 text-lg text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {about.story}
          </p>
        </section>
      )}

      {/* ── Mission & Vision (only if either exists) ──────────────── */}
      {(about.mission || about.vision) && (
        <section className="bg-brand-cream/50 dark:bg-gray-900/40 border-y border-gray-100 dark:border-gray-800">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 grid md:grid-cols-2 gap-12 md:gap-16">
            {about.mission && (
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-brand-gold font-medium">
                  Mission
                </span>
                <p className="mt-4 font-serif text-xl md:text-2xl text-brand-charcoal dark:text-gray-100 leading-snug">
                  {about.mission}
                </p>
              </div>
            )}
            {about.vision && (
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-brand-gold font-medium">
                  Vision
                </span>
                <p className="mt-4 font-serif text-xl md:text-2xl text-brand-charcoal dark:text-gray-100 leading-snug">
                  {about.vision}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Team — opt-in via admin toggle ────────────────────────── */}
      {about.showTeam !== false && about.team?.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100 text-center">
            The people behind it
          </h2>
          <div className="mt-4 mx-auto h-px w-12 bg-brand-gold/60" />

          <div
            className={`mt-14 grid gap-10 md:gap-12 ${
              about.team.length === 1
                ? 'max-w-xs mx-auto'
                : about.team.length === 2
                  ? 'sm:grid-cols-2 max-w-2xl mx-auto'
                  : 'sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {about.team.map((member, i) => (
              <figure key={`${member.name}-${i}`} className="group text-center">
                <div className="relative w-36 h-36 md:w-44 md:h-44 mx-auto mb-5 rounded-full overflow-hidden bg-brand-cream dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10">
                  {member.image?.url ? (
                    <Image
                      src={member.image.url}
                      alt={member.name}
                      fill
                      sizes="176px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-brand-green dark:text-brand-gold">
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                  )}
                </div>
                <figcaption>
                  <h3 className="font-serif text-lg font-semibold text-brand-charcoal dark:text-gray-100">
                    {member.name}
                  </h3>
                  {(member.title || member.role) && (
                    <p className="text-brand-gold text-xs tracking-wide mt-1">
                      {member.title || member.role}
                    </p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
