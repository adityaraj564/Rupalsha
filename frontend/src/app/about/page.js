'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { aboutAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FiHeart, FiStar, FiPackage } from 'react-icons/fi';

export default function AboutPage() {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aboutAPI.get()
      .then((data) => setAbout(data.about))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!about) return <div className="text-center py-20 text-gray-500">About information not available.</div>;

  const currentYear = new Date().getFullYear();
  const yearsRunning = currentYear - about.foundedYear;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-brand-cream">
        {about.coverImage?.url ? (
          <div className="relative">
            <img
              src={about.coverImage.url}
              alt={about.companyName}
              className="w-full h-auto block"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
            <div className="absolute inset-0 flex items-center justify-center text-center px-4">
              <div>
                <h1 className="font-serif text-4xl md:text-6xl font-bold text-white mb-4">{about.companyName}</h1>
                <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">{about.tagline}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 md:py-28 text-center px-4">
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-brand-green mb-4">{about.companyName}</h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">{about.tagline}</p>
          </div>
        )}
      </section>

      {/* Stats Bar */}
      <section className="bg-brand-green text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold">{about.foundedYear}</div>
            <div className="text-sm text-white/70 mt-1">Founded</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold">{yearsRunning}+</div>
            <div className="text-sm text-white/70 mt-1">Years of Passion</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold">{about.team.length}</div>
            <div className="text-sm text-white/70 mt-1">Team Members</div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      {about.story && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-10">
            <FiHeart className="mx-auto text-brand-gold mb-3" size={28} />
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal">Our Story</h2>
          </div>
          <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-line text-center">{about.story}</p>
        </section>
      )}

      {/* Mission & Vision */}
      {(about.mission || about.vision) && (
        <section className="bg-brand-cream py-16 md:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10">
            {about.mission && (
              <div className="bg-white p-8 rounded-2xl shadow-sm">
                <FiStar className="text-brand-gold mb-4" size={28} />
                <h3 className="font-serif text-2xl font-bold text-brand-charcoal mb-4">Our Mission</h3>
                <p className="text-gray-600 leading-relaxed">{about.mission}</p>
              </div>
            )}
            {about.vision && (
              <div className="bg-white p-8 rounded-2xl shadow-sm">
                <FiPackage className="text-brand-gold mb-4" size={28} />
                <h3 className="font-serif text-2xl font-bold text-brand-charcoal mb-4">Our Vision</h3>
                <p className="text-gray-600 leading-relaxed">{about.vision}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Team Section */}
      {about.team.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal mb-3">Meet Our Team</h2>
            <p className="text-gray-500">The people behind Rupalsha</p>
          </div>
          <div className={`grid gap-8 ${about.team.length === 1 ? 'max-w-sm mx-auto' : about.team.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
            {about.team.map((member, i) => (
              <div key={i} className="text-center group">
                <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden bg-brand-cream border-4 border-white shadow-lg">
                  {member.image?.url ? (
                    <Image
                      src={member.image.url}
                      alt={member.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-serif text-brand-green">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                </div>
                <h3 className="font-serif text-xl font-bold text-brand-charcoal">{member.name}</h3>
                <p className="text-brand-green font-medium text-sm mt-1">{member.title || member.role}</p>
                {member.bio && (
                  <p className="text-gray-500 text-sm mt-3 leading-relaxed max-w-xs mx-auto">{member.bio}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
