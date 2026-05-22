// Shown while the product detail server component is fetching.
// Lives at app/product/[slug]/loading.js so Next.js streams it instantly
// for navigations into this route segment.

import LoadingSpinner from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
