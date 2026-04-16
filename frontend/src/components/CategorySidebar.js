'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight, FiX } from 'react-icons/fi';

function CategoryNode({ category, selectedSlugs, onToggle, depth = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedSlugs.includes(category.slug);

  // Auto-expand if any child is selected
  useEffect(() => {
    if (hasChildren) {
      const hasSelectedChild = hasAnySelected(category.children, selectedSlugs);
      if (hasSelectedChild) setExpanded(true);
    }
  }, [selectedSlugs]);

  return (
    <div>
      <div
        className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 group ${
          isSelected
            ? 'bg-brand-green/10 text-brand-green font-medium'
            : 'hover:bg-gray-50 text-gray-700'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        <span
          className="flex-1 text-sm select-none"
          onClick={() => {
            onToggle(category.slug);
            if (hasChildren) setExpanded(true);
          }}
        >
          {category.name}
        </span>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {expanded ? (
              <FiChevronDown size={14} className="text-gray-400" />
            ) : (
              <FiChevronRight size={14} className="text-gray-400" />
            )}
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="animate-accordion-open">
          {category.children.map((child) => (
            <CategoryNode
              key={child._id}
              category={child}
              selectedSlugs={selectedSlugs}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function hasAnySelected(children, selectedSlugs) {
  for (const child of children) {
    if (selectedSlugs.includes(child.slug)) return true;
    if (child.children && hasAnySelected(child.children, selectedSlugs)) return true;
  }
  return false;
}

export default function CategorySidebar({
  categoryTree,
  selectedSlugs = [],
  onSelectCategory,
  onClearFilters,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  size,
  sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'],
  onSizeChange,
  sort,
  sortOptions = [],
  onSortChange,
  mobileOpen = false,
  onMobileClose,
}) {
  const hasFilters = selectedSlugs.length > 0 || minPrice || maxPrice || size;

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto animate-slide-right">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
              <h2 className="font-serif text-lg font-semibold">Filters</h2>
              <button
                onClick={onMobileClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-4">
              <SidebarContent
                categoryTree={categoryTree}
                selectedSlugs={selectedSlugs}
                onSelectCategory={onSelectCategory}
                onClearFilters={onClearFilters}
                hasFilters={hasFilters}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onMinPriceChange={onMinPriceChange}
                onMaxPriceChange={onMaxPriceChange}
                size={size}
                sizes={sizes}
                onSizeChange={onSizeChange}
                sort={sort}
                sortOptions={sortOptions}
                onSortChange={onSortChange}
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4">
              <button
                onClick={onMobileClose}
                className="btn-primary w-full text-sm py-2.5"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <SidebarContent
            categoryTree={categoryTree}
            selectedSlugs={selectedSlugs}
            onSelectCategory={onSelectCategory}
            onClearFilters={onClearFilters}
            hasFilters={hasFilters}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={onMinPriceChange}
            onMaxPriceChange={onMaxPriceChange}
            size={size}
            sizes={sizes}
            onSizeChange={onSizeChange}
            sort={sort}
            sortOptions={sortOptions}
            onSortChange={onSortChange}
          />
        </div>
      </aside>
    </>
  );
}

function SidebarContent({
  categoryTree,
  selectedSlugs,
  onSelectCategory,
  onClearFilters,
  hasFilters,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  size,
  sizes,
  onSizeChange,
  sort,
  sortOptions,
  onSortChange,
}) {
  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-medium text-sm text-gray-900 mb-3 uppercase tracking-wider">
          Categories
        </h3>
        <div className="space-y-0.5">
          {categoryTree.map((cat) => (
            <CategoryNode
              key={cat._id}
              category={cat}
              selectedSlugs={selectedSlugs}
              onToggle={onSelectCategory}
            />
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-medium text-sm text-gray-900 mb-3 uppercase tracking-wider">
          Price Range
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
          />
        </div>
      </div>

      {/* Size Filter */}
      <div>
        <h3 className="font-medium text-sm text-gray-900 mb-3 uppercase tracking-wider">
          Size
        </h3>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => onSizeChange(size === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                size === s
                  ? 'border-brand-green bg-brand-green text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sort (mobile) */}
      {sortOptions.length > 0 && onSortChange && (
        <div className="lg:hidden">
          <h3 className="font-medium text-sm text-gray-900 mb-3 uppercase tracking-wider">
            Sort By
          </h3>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="text-sm text-brand-green hover:underline font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
