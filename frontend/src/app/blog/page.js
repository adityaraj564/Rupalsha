'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiSearch, FiCalendar, FiEye, FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { blogsAPI } from '@/lib/api';

const PLACEHOLDER_IMAGE = '/defaults/banner-1.jpg';

export default function BlogListingPage() {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 9 };
      if (search) params.search = search;
      if (activeCategory) params.category = activeCategory;
      const data = await blogsAPI.getAll(params);
      setBlogs(data.blogs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeCategory]);

  useEffect(() => {
    blogsAPI.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, activeCategory]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  return (
    <div className="animate-fade-in hexagon-bg min-h-screen">
      {/* Hero */}
      <section className="relative bg-brand-green py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image src="/defaults/banner-1.jpg" alt="" fill className="object-cover" />
        </div>
        <div className="relative mx-auto px-4 sm:px-6 lg:px-[50px] text-center">
          <p className="text-brand-gold font-medium tracking-[0.3em] uppercase text-sm mb-4">Our Journal</p>
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-white mb-4">The Rupalsha Blog</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Tips, trends, and guides to help you shine — inside and out.
          </p>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="mx-auto px-4 sm:px-6 lg:px-[50px] py-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !activeCategory
                  ? 'bg-brand-green text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {total > 0 && (
          <p className="text-sm text-gray-500 mt-4">{total} article{total !== 1 ? 's' : ''} found</p>
        )}
      </section>

      {/* Blog Grid */}
      <section className="mx-auto px-4 sm:px-6 lg:px-[50px] pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[16/10] bg-gray-200 dark:bg-gray-700" />
                <div className="p-6 space-y-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No articles found.</p>
            {(search || activeCategory) && (
              <button
                onClick={() => { setSearch(''); setActiveCategory(''); }}
                className="mt-4 text-brand-green font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog, index) => (
                <Link
                  key={blog._id}
                  href={`/blog/${blog.slug}`}
                  className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <Image
                      src={blog.featuredImage?.url || PLACEHOLDER_IMAGE}
                      alt={blog.featuredImage?.alt || blog.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading={index < 3 ? 'eager' : 'lazy'}
                    />
                    {blog.isFeatured && (
                      <span className="absolute top-3 left-3 bg-brand-gold text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 md:p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      {blog.category && (
                        <span className="text-brand-green dark:text-brand-gold font-medium">{blog.category}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <FiCalendar size={12} />
                        {formatDate(blog.publishedAt)}
                      </span>
                    </div>

                    <h2 className="font-serif text-lg md:text-xl font-semibold text-brand-charcoal dark:text-gray-100 mb-2 group-hover:text-brand-green dark:group-hover:text-brand-gold transition-colors line-clamp-2">
                      {blog.title}
                    </h2>

                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1">
                      {blog.shortDescription}
                    </p>

                    <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-green dark:text-brand-gold group-hover:gap-2 transition-all">
                      Read More <FiArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiChevronLeft size={18} />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                      page === i + 1
                        ? 'bg-brand-green text-white'
                        : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
