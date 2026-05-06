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

        {about.coverImage?.url && (
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-3xl bg-brand-cream dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/5 shadow-xl">
              <Image
                src={about.coverImage.url}
                alt={about.companyName}
                fill
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Promises (admin-editable, hidden if empty) ────────── */}
      {about.promises?.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16 md:mt-24">
          <div
            className={`grid gap-3 md:gap-4 grid-cols-2 ${
              // Static class strings only \u2014 Tailwind\u2019s JIT can\u2019t see
              // template-interpolated class names.
              about.promises.length === 1 ? 'md:grid-cols-1'
                : about.promises.length === 2 ? 'md:grid-cols-2'
                  : about.promises.length === 3 ? 'md:grid-cols-3'
                    : 'md:grid-cols-4'
            }`}
          >
            {about.promises.map((p, i) => {
              const Icon = PROMISE_ICONS[p.icon] || FiAward;
              return (
                <div
                  key={`${p.label}-${i}`}
                  className="flex items-center gap-3 rounded-2xl bg-brand-cream/50 dark:bg-gray-900 ring-1 ring-gray-100 dark:ring-gray-800 px-4 py-3"
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
