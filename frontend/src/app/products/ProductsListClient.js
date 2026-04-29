'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import CategorySidebar from '@/components/CategorySidebar';
import { ProductsPageSkeleton, ProductGridSkeleton } from '@/components/Skeleton';
import { productsAPI, categoriesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Top Rated' },
];

const SIZES = ['Free Size', '2.2', '2.4', '2.6', '2.8', '2.10', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

function ProductsContent({ initialProducts = null, initialTotal = 0, initialTotalPages = 1, initialCategoryTree = [] } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const hasInitialProducts = Array.isArray(initialProducts);
  const skipFirstFetchRef = useRef(hasInitialProducts);

  const [categoryTree, setCategoryTree] = useState(initialCategoryTree);
  const [products, setProducts] = useState(hasInitialProducts ? initialProducts : []);
  const [loading, setLoading] = useState(!hasInitialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [debouncedMinPrice, setDebouncedMinPrice] = useState('');
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState('');
  const [size, setSize] = useState('');
  const search = searchParams.get('search') || '';

  // Debounce price filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
      setDebouncedMaxPrice(maxPrice);
    }, 500);
    return () => clearTimeout(timer);
  }, [minPrice, maxPrice]);

  // Fetch category tree (skip if SSR provided one)
  useEffect(() => {
    if (categoryTree.length > 0) return;
    categoriesAPI.getTree().then((data) => {
      setCategoryTree(data.categories);
    }).catch(() => {});
  }, [categoryTree.length]);

  useEffect(() => {
    // Skip the very first effect run when SSR already gave us products for
    // this URL — avoids a redundant network round-trip on first paint.
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    const fetchProducts = async () => {
      if (products.length === 0) setLoading(true);
      try {
        const params = { page, limit: 12, sort };
        if (selectedCategorySlug) params.categorySlug = selectedCategorySlug;
        if (search) params.search = search;
        if (debouncedMinPrice) params.minPrice = debouncedMinPrice;
        if (debouncedMaxPrice) params.maxPrice = debouncedMaxPrice;
        if (size) params.size = size;
        if (searchParams.get('featured')) params.featured = 'true';
        if (searchParams.get('trending')) params.trending = 'true';
        if (!isAuthenticated) params.hideOutOfStock = 'true';

        const data = await productsAPI.getAll(params);
        setProducts(data.products);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error(err);
        // Auto-retry after 3s if we got 0 products
        if (products.length === 0) {
          setTimeout(() => fetchProducts(), 3000);
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategorySlug, sort, debouncedMinPrice, debouncedMaxPrice, size, page, search, searchParams, isAuthenticated]);

  const clearFilters = () => {
    setSelectedCategorySlug('');
    setMinPrice('');
    setMaxPrice('');
    setDebouncedMinPrice('');
    setDebouncedMaxPrice('');
    setSize('');
    setSort('newest');
    setPage(1);
  };

  const handleSelectCategory = (slug) => {
    const newSlug = selectedCategorySlug === slug ? '' : slug;
    setSelectedCategorySlug(newSlug);
    if (newSlug !== 'rings') setSize('');
    setPage(1);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-gold">
              {searchParams.get('trending') ? 'Trending' : searchParams.get('featured') ? 'New Arrivals' : 'Shop All'}
            </h1>
            <p className="text-gray-500 mt-2">{total} product{total !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:border-brand-green transition-colors"
            >
              <FiFilter size={16} /> Filters
            </button>
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

      {/* Main Layout */}
      <div className="flex gap-8">
        <CategorySidebar
          categoryTree={categoryTree}
          selectedSlugs={selectedCategorySlug ? [selectedCategorySlug] : []}
          onSelectCategory={handleSelectCategory}
          onClearFilters={clearFilters}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={(v) => { setMinPrice(v); setPage(1); }}
          onMaxPriceChange={(v) => { setMaxPrice(v); setPage(1); }}
          size={size}
          sizes={SIZES}
          onSizeChange={(s) => { setSize(s); setPage(1); }}
          showSizeFilter={selectedCategorySlug === 'rings'}
          sort={sort}
          sortOptions={SORT_OPTIONS}
          onSortChange={(s) => { setSort(s); setPage(1); }}
          mobileOpen={mobileFiltersOpen}
          onMobileClose={() => setMobileFiltersOpen(false)}
        />

        {/* Products Grid */}
        <div className="flex-1 min-w-0">
          {loading && products.length === 0 ? (
            <ProductGridSkeleton count={6} cols="grid-cols-2 md:grid-cols-3" />
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No products found</p>
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
                        page === p ? 'bg-brand-green text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-green'
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

export default function ProductsListClient(props) {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsContent {...props} />
    </Suspense>
  );
}
