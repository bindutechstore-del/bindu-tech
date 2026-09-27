import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { listProducts, getCategories, getBrands } from "@/lib/queries/catalog";
import { parseProductQuery } from "@/lib/validations/catalog";
import { getStoreSettings } from "@/lib/queries/settings";
import { ProductGrid } from "@/components/storefront/sections";
import { FilterPanel } from "@/components/product/filter-panel";
import { SortSelect } from "@/components/product/sort-select";
import { LoadMoreProducts } from "@/components/product/load-more-products";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { store_name } = await getStoreSettings();
  return {
    title: "All products",
    description: `Browse every gadget ${store_name} stocks — filter by category, brand and price.`,
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseProductQuery(params);

  const [{ products, total, page, pageCount }, categories, brands] =
    await Promise.all([listProducts(query), getCategories(), getBrands()]);

  // Echoed to the load-more action so appended pages keep the same filters.
  // `page` is dropped: the client tracks its own cursor from here.
  const listingQuery = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => {
      if (k === "page" || v == null) return [];
      const value = Array.isArray(v) ? v[0] : v;
      return value ? [[k, value] as [string, string]] : [];
    }),
  ).toString();

  const activeCategory = categories.find((c) => c.slug === query.category);
  // For a main category: its sub-categories. For a sub-category: its
  // siblings, so the shopper can hop across without going back.
  const parentCategory = activeCategory?.parent_id
    ? categories.find((c) => c.id === activeCategory.parent_id)
    : undefined;
  const chipParent = parentCategory ?? activeCategory;
  const subCategories = chipParent
    ? categories.filter((c) => c.parent_id === chipParent.id)
    : [];

  const heading = query.q
    ? `Results for “${query.q}”`
    : (activeCategory?.name ?? (query.new === "1" ? "New arrivals" : "All products"));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/products" className="hover:text-brand-700">
          Products
        </Link>
        {parentCategory ? (
          <>
            <span className="mx-1.5">/</span>
            <Link
              href={`/products?category=${parentCategory.slug}`}
              className="hover:text-brand-700"
            >
              {parentCategory.name}
            </Link>
          </>
        ) : null}
        {activeCategory ? (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-ink">{activeCategory.name}</span>
          </>
        ) : null}
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{heading}</h1>
          <p className="mt-1 text-sm text-ink-muted tabular">
            {total} {total === 1 ? "product" : "products"}
            {activeCategory?.description ? ` · ${activeCategory.description}` : ""}
          </p>
        </div>
        <SortSelect value={query.sort} />
      </div>

      {chipParent && subCategories.length > 0 ? (
        <div className="-mt-3 mb-6 flex flex-wrap gap-2">
          {[chipParent, ...subCategories].map((c) => {
            const on = c.id === activeCategory?.id;
            return (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                aria-current={on ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  on
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-line bg-surface text-ink-soft hover:border-brand-600 hover:text-brand-700"
                }`}
              >
                {c.id === chipParent.id ? `All ${c.name}` : c.name}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <FilterPanel
          categories={categories}
          brands={brands}
          query={query}
          resultCount={total}
        />

        <div>
          {products.length === 0 ? (
            <EmptyState
              icon={<SearchX size={32} />}
              title="Nothing matched those filters"
              description={
                query.q
                  ? `We could not find anything for “${query.q}”. Try a shorter search, or clear your filters.`
                  : "Try widening your price range or clearing a filter."
              }
              action={
                <Button asChild variant="outline">
                  <Link href="/products">Clear all filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ProductGrid products={products} priorityCount={5} />
              <LoadMoreProducts
                query={listingQuery}
                initialNextPage={page < pageCount ? page + 1 : null}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
