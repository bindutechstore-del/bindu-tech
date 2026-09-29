import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/queries/catalog";
import { CategoryGrid } from "@/components/storefront/sections";

export const metadata: Metadata = {
  title: "Shop Gadgets & Electronics by Category",
  description:
    "Every Bindu Tech category in one place: chargers, power banks, audio, computer accessories, smart gadgets and more, at the best price in Bangladesh.",
  alternates: { canonical: "/categories" },
};

/**
 * Where the homepage "Shop by category" → See all goes: every main category
 * as a tile, with its sub-categories listed underneath.
 */
export default async function CategoriesPage() {
  const categories = await getCategories();
  const mains = categories.filter((c) => !c.parent_id);
  const withSubs = mains.filter((m) => categories.some((c) => c.parent_id === m.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">All categories</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight text-ink">All categories</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted tabular">{mains.length} categories</p>

      <CategoryGrid categories={mains} />

      {withSubs.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {withSubs.map((m) => (
            <section key={m.id}>
              <h2 className="text-sm font-semibold text-ink">
                <Link href={`/products?category=${m.slug}`} className="hover:text-brand-700">
                  {m.name}
                </Link>
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {categories
                  .filter((c) => c.parent_id === m.id)
                  .map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/products?category=${s.slug}`}
                        className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-soft hover:border-brand-600 hover:text-brand-700"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
