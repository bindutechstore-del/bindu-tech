import type { Metadata } from "next";
import Link from "next/link";
import { getBrands } from "@/lib/queries/catalog";
import { BrandDirectory } from "@/components/storefront/brand-directory";

export const metadata: Metadata = {
  title: "Our brands",
  description: "Every brand in the shop — find one and see its products.",
};

/** Where the homepage "Our Brands" → See all goes. */
export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Brands</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight text-ink">Our brands</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted tabular">{brands.length} brands</p>

      <BrandDirectory
        brands={brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug, logo_url: b.logo_url }))}
      />
    </div>
  );
}
