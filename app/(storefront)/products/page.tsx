import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { listProducts, getCategories, getBrands } from "@/lib/queries/catalog";
import { parseProductQuery } from "@/lib/validations/catalog";
import { getStoreSettings } from "@/lib/queries/settings";
import { metaDescription } from "@/lib/seo";
import { ProductGrid } from "@/components/storefront/sections";
import { FilterPanel } from "@/components/product/filter-panel";
import { LoadMoreProducts } from "@/components/product/load-more-products";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

/**
 * One listing route serves every category and brand, so the title follows
 * the filter: "<Category> Price in Bangladesh" is what shoppers here search.
 * Search results are not indexed (endless thin duplicates), and sort / price
 * / page variations point back to the plain listing as their canonical.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const one = (k: string) => {
    const v = params[k];
    return ((Array.isArray(v) ? v[0] : v) ?? "").trim();
  };
  const [{ store_name }, categories, brands] = await Promise.all([
    getStoreSettings(),
    getCategories(),
    getBrands(),
  ]);

  const q = one("q");
  if (q) {
    return {
      title: `Search results for “${q.slice(0, 60)}”`,
      robots: { index: false, follow: true },
      alternates: { canonical: "/products" },
    };
  }

  const category = categories.find((c) => c.slug === one("category"));
  if (category) {
    const title = `${category.name} Price in Bangladesh`;
    const url = `/products?category=${category.slug}`;
    const description = metaDescription(
      `Buy ${category.name} online at the best price in Bangladesh from ${store_name}. Compare prices, pay cash on delivery and get delivery anywhere in Bangladesh.`,
    );
    return {
      title,
      description,
      keywords: [`${category.name} price in Bangladesh`, `${category.name} price in BD`, `buy ${category.name} online`, store_name],
      alternates: { canonical: url },
      openGraph: { title: `${title} | ${store_name}`, description, url },
    };
  }

  const brand = brands.find((b) => b.slug === one("brand"));
  if (brand) {
    return {
      title: `${brand.name} Products Price in Bangladesh`,
      description: metaDescription(
        `Shop ${brand.name} products at the best price in Bangladesh from ${store_name}, with cash on delivery nationwide.`,
      ),
      alternates: { canonical: `/brands/${brand.slug}` },
    };
  }

  const title = "Gadgets & Electronics Price in Bangladesh";
  const description = metaDescription(
    `Shop every gadget at ${store_name}: chargers, power banks, earbuds, smart watches, keyboards and more at the best price in Bangladesh. Cash on delivery nationwide.`,
  );
  return {
    title,
    description,
    alternates: { canonical: "/products" },
    openGraph: { title: `${title} | ${store_name}`, description, url: "/products" },
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
              {/* The cards are h3s; this keeps the outline h1 → h2 → h3. */}
              <h2 className="sr-only">Products</h2>
              <ProductGrid products={products} priorityCount={2} />
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
