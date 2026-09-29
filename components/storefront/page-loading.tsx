/**
 * Instant navigation feedback for storefront pages.
 *
 * Each section re-exports this as its loading.tsx. It deliberately does NOT
 * sit at the (storefront) root any more: a root loading boundary wrapped the
 * homepage too, so the hero arrived hidden and waited for a script to reveal
 * it — about a second of extra LCP on a phone.
 */
export default function StorefrontLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero shimmer */}
      <div className="skeleton mb-8 h-64 w-full rounded-2xl sm:h-80 lg:h-[420px]" />

      {/* Category tiles shimmer */}
      <div className="mb-8">
        <div className="skeleton mb-4 h-7 w-48 rounded" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-4">
              <div className="skeleton size-12 rounded-full" />
              <div className="skeleton h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Product grid shimmer */}
      <div className="skeleton mb-4 h-7 w-40 rounded" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="skeleton aspect-square" />
            <div className="space-y-2 p-3">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-5 w-1/3 rounded" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
