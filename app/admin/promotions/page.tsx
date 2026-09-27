import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PromotionsManager,
  type BreakRow,
  type BundleRow,
} from "@/components/admin/promotions-manager";
import { PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * Quantity breaks and bundles.
 *
 * Gated on the `coupons` permission rather than a new one: an operator who can
 * set a discount code is already trusted to set a discount.
 */
export default async function AdminPromotionsPage() {
  await requirePermission("coupons");
  const db = createAdminClient();

  const [{ data: breaks }, { data: bundles }, { data: items }, { data: categories }] =
    await Promise.all([
      db
        .from("quantity_breaks")
        .select("id, product_id, category_id, min_quantity, discount_percent")
        .order("min_quantity"),
      db.from("bundles").select("id, name, discount_percent").order("created_at", { ascending: false }),
      db.from("bundle_items").select("bundle_id, product_id"),
      db.from("categories").select("id, name").eq("is_active", true).order("position"),
    ]);

  // Names only for the products the rules actually use. Products are chosen
  // through a search box now, so the page no longer preloads a catalogue
  // slice — and a rule on product #301 no longer reads "Unknown product".
  const usedIds = [
    ...new Set(
      [
        ...((breaks ?? []) as { product_id: string | null }[]).map((b) => b.product_id),
        ...((items ?? []) as { product_id: string }[]).map((i) => i.product_id),
      ].filter((v): v is string => Boolean(v)),
    ),
  ];
  const { data: usedProducts } = usedIds.length
    ? await db.from("products").select("id, name").in("id", usedIds)
    : { data: [] };

  const categoryList = (categories ?? []) as { id: string; name: string }[];
  const productName = new Map(
    ((usedProducts ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
  );
  const categoryName = new Map(categoryList.map((c) => [c.id, c.name]));

  const breakRows: BreakRow[] = (
    (breaks ?? []) as {
      id: string;
      product_id: string | null;
      category_id: string | null;
      min_quantity: number;
      discount_percent: number;
    }[]
  ).map((r) => ({
    id: r.id,
    min_quantity: r.min_quantity,
    discount_percent: Number(r.discount_percent),
    scope: r.product_id ? "product" : "category",
    target: r.product_id
      ? (productName.get(r.product_id) ?? "Unknown product")
      : (categoryName.get(r.category_id ?? "") ?? "Unknown category"),
  }));

  const itemRows = (items ?? []) as { bundle_id: string; product_id: string }[];
  const bundleRows: BundleRow[] = (
    (bundles ?? []) as { id: string; name: string; discount_percent: number }[]
  ).map((b) => ({
    id: b.id,
    name: b.name,
    discount_percent: Number(b.discount_percent),
    products: itemRows
      .filter((i) => i.bundle_id === b.id)
      .map((i) => productName.get(i.product_id) ?? "Unknown"),
  }));

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Volume discounts and bundles. Both are priced in SQL alongside coupons, so they can never disagree with the cart."
      />
      <PromotionsManager
        breaks={breakRows}
        bundles={bundleRows}
        categories={categoryList}
      />
    </>
  );
}
