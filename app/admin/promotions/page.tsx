import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PromotionsManager,
  type BreakRow,
  type BundleRow,
} from "@/components/admin/promotions-manager";
import { PageHeader } from "@/components/ui/primitives";
import { FlashSaleManager, type FlashSaleRow } from "@/components/admin/flash-sale-manager";

/** ISO → "YYYY-MM-DDTHH:mm" in Bangladesh time, for a datetime-local box. */
function toDhakaInput(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(" ", "T");
}

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

  const [
    { data: breaks },
    { data: bundles },
    { data: items },
    { data: categories },
    { data: sales },
    { data: saleItems },
  ] = await Promise.all([
      db
        .from("quantity_breaks")
        .select("id, product_id, category_id, min_quantity, discount_percent")
        .order("min_quantity"),
      db.from("bundles").select("id, name, discount_percent").order("created_at", { ascending: false }),
      db.from("bundle_items").select("bundle_id, product_id"),
      db.from("categories").select("id, name").eq("is_active", true).order("position"),
      db
        .from("flash_sales")
        .select("id, title, subtitle, starts_at, ends_at, is_active")
        .order("starts_at", { ascending: false })
        .limit(20),
      db
        .from("flash_sale_items")
        .select("id, flash_sale_id, product_id, sale_price_paisa, stock_limit, sold_count, position")
        .order("position"),
    ]);

  // Names only for the products the rules actually use. Products are chosen
  // through a search box now, so the page no longer preloads a catalogue
  // slice — and a rule on product #301 no longer reads "Unknown product".
  const usedIds = [
    ...new Set(
      [
        ...((breaks ?? []) as { product_id: string | null }[]).map((b) => b.product_id),
        ...((items ?? []) as { product_id: string }[]).map((i) => i.product_id),
        ...((saleItems ?? []) as { product_id: string }[]).map((i) => i.product_id),
      ].filter((v): v is string => Boolean(v)),
    ),
  ];
  const { data: usedProducts } = usedIds.length
    ? await db.from("products").select("id, name, price_paisa").in("id", usedIds)
    : { data: [] };

  const categoryList = (categories ?? []) as { id: string; name: string }[];
  const used = (usedProducts ?? []) as { id: string; name: string; price_paisa: number }[];
  const productName = new Map(used.map((p) => [p.id, p.name]));
  const productPrice = new Map(used.map((p) => [p.id, p.price_paisa]));

  // Status is decided here, once, so server and browser cannot disagree.
  const now = Date.now();
  const saleRows: FlashSaleRow[] = (
    (sales ?? []) as {
      id: string;
      title: string;
      subtitle: string | null;
      starts_at: string;
      ends_at: string;
      is_active: boolean;
    }[]
  ).map((s) => {
    const start = new Date(s.starts_at).getTime();
    const end = new Date(s.ends_at).getTime();
    return {
      id: s.id,
      title: s.title,
      subtitle: s.subtitle ?? "",
      startsInput: toDhakaInput(s.starts_at),
      endsInput: toDhakaInput(s.ends_at),
      isActive: s.is_active,
      status: !s.is_active
        ? "off"
        : now < start
          ? "scheduled"
          : now > end
            ? "ended"
            : "live",
      items: (
        (saleItems ?? []) as {
          id: string;
          flash_sale_id: string;
          product_id: string;
          sale_price_paisa: number;
          stock_limit: number | null;
          sold_count: number;
        }[]
      )
        .filter((i) => i.flash_sale_id === s.id)
        .map((i) => ({
          id: i.id,
          productId: i.product_id,
          name: productName.get(i.product_id) ?? "Deleted product",
          regularPaisa: productPrice.get(i.product_id) ?? 0,
          salePaisa: i.sale_price_paisa,
          stockLimit: i.stock_limit,
          sold: i.sold_count,
        })),
    };
  });
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
      <div className="mb-4">
        <FlashSaleManager sales={saleRows} />
      </div>
      <PromotionsManager
        breaks={breakRows}
        bundles={bundleRows}
        categories={categoryList}
      />
    </>
  );
}
