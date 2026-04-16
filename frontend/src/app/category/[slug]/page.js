'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import CategorySidebar from '@/components/CategorySidebar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { productsAPI, categoriesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { FiFilter, FiChevronDown, FiChevronRight } from 'react-icons/fi';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Top Rated' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

export default function CategoryPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [categoryTree, setCategoryTree] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [ancestors, setAncestors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [selectedSlug, setSelectedSlug] = useState(slug);
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [size, setSize] = useState('');

  // Fetch category tree
  useEffect(() => {
    categoriesAPI.getTree().then((data) => {
      setCategoryTree(data.categories);
      setTreeLoading(false);
    }).catch(() => setTreeLoading(false));
  }, []);

  // Fetch current category info
  useEffect(() => {
    if (!slug) return;
    setSelectedSlug(slug);
    categoriesAPI.getBySlug(slug).then((data) => {
      setCurrentCategory(data.category);
      setAncestors(data.ancestors || []);
    }).catch(() => {
      setCurrentCategory(null);
    });
  }, [slug]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 12, sort };
        params.categorySlug = selectedSlug;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (size) params.size = size;
        if (!isAuthenticated) params.hideOutOfStock = 'true';

        const data = await productsAPI.getAll(params);
        setProducts(data.products);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedSlug, sort, minPrice, maxPrice, size, page, isAuthenticated]);

  const handleSelectCategory = useCallback((catSlug) => {
    if (catSlug === selectedSlug) {
      // Deselect - go back to the main category from URL
      setSelectedSlug(slug);
    } else {
      setSelectedSlug(catSlug);
    }
    setPage(1);
  }, [selectedSlug, slug]);

  const clearFilters = () => {
    setSelectedSlug(slug);
    setMinPrice('');
    setMaxPrice('');
    setSize('');
    setSort('newest');
    setPage(1);
  };

  const pageTitle = currentCategory?.name || 'Shop';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <button onClick={() => router.push('/products')} className="hover:text-brand-green transition-colors">
          Shop All
        </button>
        {ancestors.map((anc) => (
          <span key={anc._id} className="flex items-center gap-2">
            <FiChevronRight size={12} />
            <button
              onClick={() => router.push(`/category/${anc.slug}`)}
              className="hover:text-brand-green transition-colors"
            >
              {anc.name}
            </button>
          </span>
        ))}
        {currentCategory && (
          <span className="flex items-center gap-2">
            <FiChevronRight size={12} />
            <span className="text-brand-charcoal font-medium">{currentCategory.name}</span>
          </span>
        )}
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal">
              {pageTitle}
            </h1>
            <p className="text-gray-500 mt-2">{total} product{total !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile filter button */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:border-brand-green transition-colors"
            >
              <FiFilter size={16} /> Filters
            </button>
            {/* Sort dropdown */}
            <div className="relative hidden lg:block">
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm cursor-pointer hover:border-brand-green transition-colors"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar + Products */}
      <div className="flex gap-8">
        {!treeLoading && (
          <CategorySidebar
            categoryTree={categoryTree}
            selectedSlugs={selectedSlug !== slug ? [selectedSlug] : [slug]}
            onSelectCategory={handleSelectCategory}
            onClearFilters={clearFilters}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={(v) => { setMinPrice(v); setPage(1); }}
            onMaxPriceChange={(v) => { setMaxPrice(v); setPage(1); }}
            size={size}
            sizes={SIZES}
            onSizeChange={(s) => { setSize(s); setPage(1); }}
            sort={sort}
            sortOptions={SORT_OPTIONS}
            onSortChange={(s) => { setSort(s); setPage(1); }}
            mobileOpen={mobileFiltersOpen}
            onMobileClose={() => setMobileFiltersOpen(false)}
          />
        )}

        {/* Products Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No products found in this category</p>
              <button onClick={clearFilters} className="text-brand-green mt-4 hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPage(p); window.scrollTo(0, 0); }}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        page === p
                          ? 'bg-brand-green text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-green'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
