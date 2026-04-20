'use client';

// ── Base Skeleton Block ──
export function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return (
    <div className={`skeleton ${rounded} ${className}`} />
  );
}

// ── Product Card Skeleton ──
export function ProductCardSkeleton() {
  return (
    <div className="card dark:bg-gray-800 overflow-hidden">
      <div className="relative aspect-[3/4] skeleton" />
      <div className="p-3 md:p-4 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

// ── Product Grid Skeleton ──
export function ProductGridSkeleton({ count = 8, cols = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' }) {
  return (
    <div className={`grid ${cols} gap-4 md:gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Product Detail Skeleton ──
export function ProductDetailSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-8">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        {/* Image */}
        <div>
          <div className="aspect-[3/4] skeleton rounded-2xl mb-4" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-20 h-24 skeleton rounded-lg" />
            ))}
          </div>
        </div>
        {/* Details */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-6 w-32 pt-4" />
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-14" rounded="rounded-lg" />
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 w-40" rounded="rounded-full" />
            <Skeleton className="h-12 w-40" rounded="rounded-full" />
          </div>
          <div className="pt-6 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cart Item Skeleton ──
export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl">
      <div className="w-24 h-32 skeleton rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-20" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-8 w-8" rounded="rounded-full" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-8 w-8" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Cart Page Skeleton ──
export function CartSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12">
      <Skeleton className="h-9 w-48 mb-8" />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CartItemSkeleton key={i} />
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 h-fit space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-3">
            <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
            <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-12" /></div>
            <div className="flex justify-between"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-20" /></div>
          </div>
          <Skeleton className="h-12 w-full" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Order Card Skeleton ──
export function OrderCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" rounded="rounded-full" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-12 h-12 skeleton rounded-lg" />
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

// ── Orders Page Skeleton ──
export function OrdersSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12">
      <Skeleton className="h-9 w-40 mb-6" />
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 flex-shrink-0" rounded="rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ── Sidebar Skeleton (for products/category pages) ──
export function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32 mb-4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2 ml-2">
          <Skeleton className="h-4 w-28" />
          {i < 3 && (
            <div className="ml-4 space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Products Page Skeleton (with sidebar) ──
export function ProductsPageSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
        <Skeleton className="h-10 w-36" rounded="rounded-lg" />
      </div>
      <div className="flex gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <SidebarSkeleton />
        </div>
        <div className="flex-1">
          <ProductGridSkeleton count={6} cols="grid-cols-2 md:grid-cols-3" />
        </div>
      </div>
    </div>
  );
}

// ── Home Featured Section Skeleton ──
export function HomeSectionSkeleton() {
  return (
    <section className="py-16 md:py-24 bg-white dark:bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-[50px]">
        <div className="flex items-end justify-between mb-10">
          <div>
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-40 mt-2" />
          </div>
          <Skeleton className="h-4 w-20 hidden md:block" />
        </div>
        <ProductGridSkeleton count={4} />
      </div>
    </section>
  );
}

// ── About Page Skeleton ──
export function AboutSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="relative h-[50vh] skeleton" />
      <div className="mx-auto px-4 sm:px-6 lg:px-[50px] py-16 space-y-8">
        <Skeleton className="h-10 w-64 mx-auto" />
        <div className="max-w-3xl mx-auto space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-12 w-24 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Admin Dashboard Skeleton ──
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" rounded="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Admin Table Skeleton ──
export function AdminTableSkeleton({ rows = 8 }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 flex-1 max-w-md" rounded="rounded-lg" />
        <Skeleton className="h-10 w-32" rounded="rounded-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-lg p-3">
          <Skeleton className="w-12 h-12" rounded="rounded-lg" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" rounded="rounded-lg" />
            <Skeleton className="h-8 w-8" rounded="rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Profile Page Skeleton ──
export function ProfileSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-[50px] py-8 md:py-12">
      <Skeleton className="h-9 w-40 mb-6" />
      <div className="flex gap-2 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28" rounded="rounded-full" />
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" rounded="rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-12 w-40 mt-4" rounded="rounded-full" />
      </div>
    </div>
  );
}
