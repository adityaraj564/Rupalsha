'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { productsAPI } from '@/lib/api';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Top Rated' },
];

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'sarees', label: 'Sarees' },
  { value: 'kurtis', label: 'Kurtis' },
  { value: 'lehengas', label: 'Lehengas' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'tops', label: 'Tops' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'home decors', label: 'Home Decors' },
  { value: 'gift items', label: 'Gift Items' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [size, setSize] = useState('');
  const search = searchParams.get('search') || '';

  useEffect(() => {
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 12, sort };
        if (category) params.category = category;
        if (search) params.search = search;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (size) params.size = size;
        if (searchParams.get('featured')) params.featured = 'true';
        if (searchParams.get('trending')) params.trending = 'true';

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
  }, [category, sort, minPrice, maxPrice, size, page, search, searchParams]);

  const clearFilters = () => {
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSize('');
    setSort('newest');
    setPage(1);
  };

  const hasFilters = category || minPrice || maxPrice || size;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal">
            {search ? `Results for "${search}"` : category ? CATEGORIES.find(c => c.value === category)?.label || 'Shop' : 'Shop All'}
          </h1>
          {search && (
            <button
              onClick={() => router.push('/products')}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-500 hover:text-brand-green border border-gray-300 rounded-full transition-colors"
            >
              <FiX size={14} /> Clear search
            </button>
          )}
        </div>
        <p className="text-gray-500 mt-2">{total} product{total !== 1 ? 's' : ''} found</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="md:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <FiFilter size={16} /> Filters
        </button>

        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                category === cat.value
                  ? 'bg-brand-green text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-green'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`${filtersOpen ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto' : 'hidden'} md:block md:static md:w-56 flex-shrink-0`}>
          <div className="flex items-center justify-between mb-6 md:hidden">
            <h2 className="font-serif text-xl font-semibold">Filters</h2>
            <button onClick={() => setFiltersOpen(false)}><FiX size={24} /></button>
          </div>

          {/* Mobile Categories */}
          <div className="md:hidden mb-6">
            <h3 className="font-medium text-sm text-gray-700 mb-3">Category</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs ${
                    category === cat.value ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="mb-6">
            <h3 className="font-medium text-sm text-gray-700 mb-3">Price Range</h3>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Size */}
          <div className="mb-6">
            <h3 className="font-medium text-sm text-gray-700 mb-3">Size</h3>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSize(size === s ? '' : s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    size === s ? 'border-brand-green bg-brand-green text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-brand-green hover:underline">
              Clear all filters
            </button>
          )}

          <button
            onClick={() => setFiltersOpen(false)}
            className="md:hidden btn-primary w-full mt-6"
          >
            Apply Filters
          </button>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <LoadingSpinner />
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

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProductsContent />
    </Suspense>
  );
}
