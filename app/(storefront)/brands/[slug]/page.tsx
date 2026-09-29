import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { listProducts } from "@/lib/queries/catalog";
import { parseProductQuery } from "@/lib/validations/catalog";
import { ProductGrid } from "@/components/storefront/sections";
import { BrandLogo } from "@/components/storefront/brand-carousel";
import { ReadMore } from "@/components/storefront/read-more";
import { EmptyState } from "@/components/ui/primitives";
import type { Brand } from "@/types/database";
import { getStoreSettings } from "@/lib/queries/settings";
import { metaDescription } from "@/lib/seo";

const getBrand = cache(async (slug: string): Promise<Brand | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as Brand | null) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const brand = await getBrand((await params).slug);
  if (!brand) return { title: "Brand not found", robots: { index: false } };
  const { store_name } = await getStoreSettings();
  const title = `${brand.name} Price in Bangladesh`;
  const description = metaDescription(
    `Buy ${brand.name} products at the best price in Bangladesh from ${store_name}. ` +
      (brand.description ?? "Cash on delivery and nationwide delivery."),
  );
  return {
    title,
    description,
    keywords: [`${brand.name} price in Bangladesh`, `${brand.name} price in BD`, `${brand.name} Bangladesh`, store_name],
    alternates: { canonical: `/brands/${brand.slug}` },
    openGraph: {
      title: `${title} | ${store_name}`,
      description,
      url: `/brands/${brand.slug}`,
      ...(brand.logo_url ? { images: [{ url: brand.logo_url, alt: brand.name }] } : {}),
    },
  };
}

/**
 * A brand's own page: its logo, a few lines about it, then its products —
 * the layout the client pointed to. The full filterable list is one link
 * away when there are more than fit here.
 */
export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const { products, total } = await listProducts(parseProductQuery({ brand: slug }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/brands" className="hover:text-brand-700">
          Brands
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{brand.name}</span>
      </nav>

      <div className="mx-auto max-w-3xl">
        <div className="relative mx-auto flex aspect-[3/1] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface">
          <BrandLogo
            brand={{ id: brand.id, name: brand.name, slug: brand.slug, logo_url: brand.logo_url }}
            sizes="384px"
          />
        </div>
        <h1 className="sr-only">{brand.name}</h1>
        {brand.description ? (
          <div className="mt-6">
            <ReadMore text={brand.description} />
          </div>
        ) : null}
      </div>

      <section className="mt-10">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold tracking-tight text-ink">Brand products</h2>
          <span className="mx-auto mt-2 block h-1 w-16 rounded-full bg-brand-600" aria-hidden />
        </div>

        {products.length === 0 ? (
          <EmptyState
            title={`No ${brand.name} products right now`}
            description="Check back soon, or browse everything else in the shop."
          />
        ) : (
          <>
            <ProductGrid products={products} priorityCount={4} />
            {total > products.length ? (
              <div className="mt-6 text-center">
                <Link
                  href={`/products?brand=${brand.slug}`}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  See all {total} {brand.name} products →
                </Link>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
