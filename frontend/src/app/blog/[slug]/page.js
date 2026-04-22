'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiCalendar, FiEye, FiArrowLeft, FiTag, FiUser } from 'react-icons/fi';
import ProductCard from '@/components/ProductCard';
import { blogsAPI } from '@/lib/api';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1515562141589-67f0d569b5e9?w=1600&h=800&fit=crop';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    blogsAPI.getBySlug(slug)
      .then((data) => {
        setBlog(data.blog);
        // Update page title
        if (data.blog?.metaTitle || data.blog?.title) {
          document.title = `${data.blog.metaTitle || data.blog.title} | Rupalsha Blog`;
        }
        // Update meta description
        if (data.blog?.metaDescription) {
          let meta = document.querySelector('meta[name="description"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'description';
            document.head.appendChild(meta);
          }
          meta.content = data.blog.metaDescription;
        }
      })
      .catch((err) => setError(err.message || 'Blog not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="relative w-full aspect-[3/1] min-h-[250px] md:min-h-[400px] bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="mx-auto px-4 sm:px-6 lg:px-[50px] max-w-4xl py-10 space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
          <div className="space-y-3 mt-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-serif text-3xl font-bold mb-4">Blog Not Found</h1>
        <p className="text-gray-500 mb-6">{error || 'The article you\'re looking for doesn\'t exist.'}</p>
        <Link href="/blog" className="btn-primary">
          <FiArrowLeft className="mr-2" /> Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in hexagon-bg min-h-screen">
      {/* Banner Image */}
      <div className="relative w-full aspect-[3/1] min-h-[250px] md:min-h-[400px] bg-gray-100 dark:bg-gray-800">
        <Image
          src={blog.featuredImage?.url || PLACEHOLDER_IMAGE}
          alt={blog.featuredImage?.alt || blog.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="mx-auto max-w-4xl">
            {blog.category && (
              <span className="inline-block bg-brand-gold text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {blog.category}
              </span>
            )}
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-white leading-tight">
              {blog.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-[50px] max-w-4xl py-10 md:py-16">
        <article className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl shadow-sm border border-brand-gold/10 dark:border-brand-gold/5 px-6 md:px-12 py-10 md:py-14">
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-brand-gold/20 rounded-tl-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-brand-gold/20 rounded-tr-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-brand-gold/20 rounded-bl-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-brand-gold/20 rounded-br-3xl pointer-events-none" />

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8 pb-8 border-b border-brand-gold/10 dark:border-brand-gold/10">
          <span className="flex items-center gap-1.5">
            <FiUser size={14} /> {blog.author || 'Rupalsha'}
          </span>
          <span className="flex items-center gap-1.5">
            <FiCalendar size={14} /> {formatDate(blog.publishedAt)}
          </span>
          {blog.views > 0 && (
            <span className="flex items-center gap-1.5">
              <FiEye size={14} /> {blog.views} view{blog.views !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Content */}
        <div
          className="prose prose-lg dark:prose-invert max-w-none 
            prose-headings:font-serif prose-headings:text-brand-charcoal dark:prose-headings:text-gray-100
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
            prose-li:text-gray-600 dark:prose-li:text-gray-300
            prose-strong:text-brand-charcoal dark:prose-strong:text-gray-100
            prose-a:text-brand-green dark:prose-a:text-brand-gold prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Tags */}
        {blog.tags?.length > 0 && (
          <div className="mt-10 pt-8 border-t border-brand-gold/10 dark:border-brand-gold/10">
            <div className="flex flex-wrap items-center gap-2">
              <FiTag className="text-brand-gold/60" size={16} />
              {blog.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?search=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 rounded-full bg-brand-gold/5 dark:bg-brand-gold/10 border border-brand-gold/10 text-sm text-gray-600 dark:text-gray-300 hover:bg-brand-gold/15 hover:text-brand-gold transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-brand-green dark:text-brand-gold font-medium hover:underline">
            <FiArrowLeft size={16} /> Back to All Articles
          </Link>
        </div>
        </article>
      </div>

      {/* Related Products */}
      {blog.relatedProducts?.length > 0 && (
        <section className="bg-white dark:bg-gray-900 py-16">
          <div className="mx-auto px-4 sm:px-6 lg:px-[50px]">
            <h2 className="section-title">Related Products</h2>
            <p className="section-subtitle">Shop the pieces mentioned in this article</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-10">
              {blog.relatedProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
