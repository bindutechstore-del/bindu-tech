import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandManager, type BrandRow } from "@/components/admin/brand-manager";
import { PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * Brands.
 *
 * They were always data rather than code — a `brands` table since migration
 * 0003 — but only the seed script ever wrote to it, so an operator could not
 * add a new maker or fix a misspelling without the Supabase dashboard.
 */
export default async function AdminBrandsPage() {
  await requirePermission("products");
  const db = createAdminClient();

  const { data } = await db
    .from("brands")
    .select("id, name, slug, logo_url, description, is_active")
    .order("name");
  const brands = (data ?? []) as Omit<BrandRow, "productCount">[];

  // One head-count per brand rather than pulling every product back to tally
  // in JS — the same reasoning as the categories page. head: true returns no
  // rows, only the count.
  const counts = await Promise.all(
    brands.map((b) =>
      db
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", b.id)
        .neq("status", "archived"),
    ),
  );

  return (
    <>
      <PageHeader
        title="Brands"
        description="The makers shown on products and in the storefront's brand filter."
      />
      <BrandManager
        brands={brands.map((b, i) => ({ ...b, productCount: counts[i]?.count ?? 0 }))}
      />
    </>
  );
}
