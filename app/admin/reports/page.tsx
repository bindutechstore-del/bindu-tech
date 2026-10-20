import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRevenueSeriesRange } from "@/lib/queries/admin";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { PageHeader, Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { formatTaka, formatTakaCompact } from "@/lib/utils/money";
import { RANGE_PRESETS, resolveRange, todayDhaka } from "@/lib/utils/report-range";

export const dynamic = "force-dynamic";

/**
 * Sales and profit reporting, for any window: a preset (this month, last
 * year …) or a custom From–To in Dhaka dates, optionally narrowed to one
 * category and its sub-categories.
 *
 * Margin needs `products.cost_paisa`, which is revoked for both client roles at
 * the column level — only the service-role client can read it, which is why
 * this page is admin-side and its numbers never reach the storefront.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; days?: string; category?: string }>;
}) {
  await requirePermission("reports");
  const params = await searchParams;
  const range = resolveRange(params);
  const today = todayDhaka();

  const db = createAdminClient();

  // Category filter: the chosen category plus every category under it.
  const { data: catRows } = await db
    .from("categories")
    .select("id, name, slug, parent_id, position")
    .order("position");
  const categories = (catRows ?? []) as {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
  }[];
  const category = categories.find((c) => c.slug === params.category) ?? null;
  let productIds: string[] | null = null;
  if (category) {
    const ids = new Set([category.id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const c of categories) {
        if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
          ids.add(c.id);
          grew = true;
        }
      }
    }
    const { data } = await db.from("products").select("id").in("category_id", [...ids]).limit(5000);
    productIds = ((data ?? []) as { id: string }[]).map((p) => p.id);
  }

  // Both scans are capped. A long window on a busy shop is tens of thousands
  // of rows, and pulling them all into a Vercel function is how the reports
  // page takes the whole deployment down. Past the cap the page says the
  // figures are partial rather than presenting a short count as the truth.
  const ORDER_CAP = 10000;
  const LINE_CAP = 20000;

  let linesQuery = db
    .from("order_items")
    .select("order_id, product_id, product_name, quantity, line_total_paisa, orders!inner(placed_at, status)")
    .gte("orders.placed_at", range.fromIso)
    .lt("orders.placed_at", range.toIsoExclusive)
    .not("orders.status", "in", "(cancelled,returned)")
    .limit(LINE_CAP);
  if (productIds) linesQuery = linesQuery.in("product_id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);

  const [series, { data: orders }, { data: lines }] = await Promise.all([
    getRevenueSeriesRange(range, productIds),
    db
      .from("orders")
      .select("id, total_paisa, subtotal_paisa, discount_paisa, delivery_fee_paisa, status, payment_method")
      .gte("placed_at", range.fromIso)
      .lt("placed_at", range.toIsoExclusive)
      .order("placed_at", { ascending: false })
      .limit(ORDER_CAP),
    linesQuery,
  ]);

  const allOrders = (orders ?? []) as {
    id: string;
    total_paisa: number;
    subtotal_paisa: number;
    discount_paisa: number;
    delivery_fee_paisa: number;
    status: string;
    payment_method: string;
  }[];

  const valid = allOrders.filter(
    (o) => o.status !== "cancelled" && o.status !== "returned",
  );

  const revenue = valid.reduce((s, o) => s + o.total_paisa, 0);
  const discounts = valid.reduce((s, o) => s + o.discount_paisa, 0);
  const delivery = valid.reduce((s, o) => s + o.delivery_fee_paisa, 0);
  const cancelled = allOrders.length - valid.length;
  const aov = valid.length ? Math.round(revenue / valid.length) : 0;

  const soldLines = (lines ?? []) as unknown as {
    order_id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    line_total_paisa: number;
  }[];

  const ids = [...new Set(soldLines.map((l) => l.product_id).filter(Boolean))];
  const { data: costs } = ids.length
    ? await db.from("products").select("id, cost_paisa").in("id", ids)
    : { data: [] };

  const costById = new Map(
    ((costs ?? []) as { id: string; cost_paisa: number | null }[]).map((c) => [
      c.id,
      c.cost_paisa ?? 0,
    ]),
  );

  const cogs = soldLines.reduce(
    (s, l) => s + (costById.get(l.product_id ?? "") ?? 0) * l.quantity,
    0,
  );
  const lineSales = soldLines.reduce((s, l) => s + l.line_total_paisa, 0);
  const grossProfit = lineSales - cogs;

  // Per-product performance, ranked by units.
  const byProduct = new Map<
    string,
    { name: string; units: number; revenue: number; cost: number }
  >();
  for (const l of soldLines) {
    const key = l.product_id ?? l.product_name;
    const entry = byProduct.get(key) ?? {
      name: l.product_name,
      units: 0,
      revenue: 0,
      cost: 0,
    };
    entry.units += l.quantity;
    entry.revenue += l.line_total_paisa;
    entry.cost += (costById.get(l.product_id ?? "") ?? 0) * l.quantity;
    byProduct.set(key, entry);
  }

  const ranked = [...byProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  const byMethod = new Map<string, number>();
  for (const o of valid) {
    byMethod.set(o.payment_method, (byMethod.get(o.payment_method) ?? 0) + 1);
  }

  // Say so when a cap was hit, rather than letting a partial total read as
  // the period's real revenue.
  const truncated =
    allOrders.length >= ORDER_CAP || soldLines.length >= LINE_CAP;

  const margin = (sales: number) =>
    sales > 0 ? `${Math.round((grossProfit / sales) * 100)}%` : "—";

  // With a category chosen, order-level figures (delivery, coupons, payment
  // method) belong to whole orders, not to the category — so the tiles switch
  // to what the category itself sold.
  const categoryOrders = new Set(soldLines.map((l) => l.order_id)).size;
  const units = soldLines.reduce((s, l) => s + l.quantity, 0);
  const tiles = category
    ? [
        { label: `Sales — ${category.name}`, value: formatTakaCompact(lineSales), sub: `${categoryOrders} orders` },
        { label: "Units sold", value: String(units), sub: "In this category" },
        { label: "Gross profit", value: formatTakaCompact(grossProfit), sub: "Sales − cost of goods" },
        { label: "Margin", value: margin(lineSales), sub: "Gross profit ÷ sales" },
        { label: "Cost of goods", value: formatTakaCompact(cogs), sub: "From product cost" },
        {
          label: "Average per order",
          value: formatTaka(categoryOrders ? Math.round(lineSales / categoryOrders) : 0),
          sub: "This category's share",
        },
      ]
    : [
        { label: "Revenue", value: formatTakaCompact(revenue), sub: `${valid.length} orders` },
        { label: "Gross profit", value: formatTakaCompact(grossProfit), sub: "Revenue − cost of goods" },
        { label: "Cost of goods", value: formatTakaCompact(cogs), sub: "From product cost" },
        { label: "Average order", value: formatTaka(aov), sub: "Per valid order" },
        { label: "Discounts given", value: formatTakaCompact(discounts), sub: "Coupons applied" },
        { label: "Delivery collected", value: formatTakaCompact(delivery), sub: "Shipping fees" },
        { label: "Cancelled / returned", value: String(cancelled), sub: "Excluded from revenue" },
        { label: "Margin", value: margin(revenue), sub: "Gross profit ÷ revenue" },
      ];

  const dateLabel = (ymd: string) =>
    new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const presetHref = (key: string) =>
    `/admin/reports?range=${key}${category ? `&category=${category.slug}` : ""}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${range.label}: ${dateLabel(range.from)} – ${dateLabel(range.to)}${
          category ? ` · ${category.name}` : ""
        }. Cancelled and returned orders are excluded throughout.`}
      />

      {truncated ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-sm text-warning"
        >
          This window exceeds what one report can total, so these figures cover
          only the most recent {ORDER_CAP.toLocaleString()} orders. Choose a
          shorter window for an exact total.
        </p>
      ) : null}

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <Link
              key={p.key}
              href={presetHref(p.key)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                range.key === p.key ? "bg-brand-600 text-white" : "bg-surface-sunken text-ink-soft hover:bg-line"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* A plain GET form: works without JavaScript, and the phone's own
            date picker opens for From and To. */}
        <form method="get" className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">From date</span>
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              max={today}
              required
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">To date</span>
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              max={today}
              required
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Category</span>
            <Select name="category" defaultValue={category?.slug ?? ""}>
              <option value="">All categories</option>
              {categories
                .filter((c) => !c.parent_id)
                .flatMap((top) => [
                  <option key={top.id} value={top.slug}>
                    {top.name}
                  </option>,
                  ...categories
                    .filter((c) => c.parent_id === top.id)
                    .map((c) => (
                      <option key={c.id} value={c.slug}>
                        {"— "}
                        {c.name}
                      </option>
                    )),
                ])}
            </Select>
          </label>
          <Button type="submit">Show</Button>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs font-medium text-ink-muted">{t.label}</p>
            <p className="mt-1.5 text-xl font-bold tabular tracking-tight text-ink">
              {t.value}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-faint">{t.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-ink">Revenue over time</h2>
        <RevenueChart data={series} />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Product performance</h2>
          <p className="text-xs text-ink-muted">Top 20 by revenue in this window{category ? ` · ${category.name}` : ""}.</p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-150 text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-muted">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-right font-medium">Units</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                  <th className="pb-2 text-right font-medium">Profit</th>
                  <th className="pb-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ranked.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-ink-muted">
                      No sales in this window.
                    </td>
                  </tr>
                ) : (
                  ranked.map((p) => {
                    const profit = p.revenue - p.cost;
                    const pct = p.revenue ? Math.round((profit / p.revenue) * 100) : 0;
                    return (
                      <tr key={p.name}>
                        <td className="py-2.5">
                          <span className="clamp-2 font-medium text-ink">{p.name}</span>
                        </td>
                        <td className="py-2.5 text-right tabular text-ink-muted">
                          {p.units}
                        </td>
                        <td className="py-2.5 text-right tabular text-ink">
                          {formatTaka(p.revenue)}
                        </td>
                        <td className="py-2.5 text-right tabular">
                          <span className={profit >= 0 ? "text-success" : "text-danger"}>
                            {formatTaka(profit)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular text-ink-muted">
                          {p.cost > 0 ? `${pct}%` : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Payment mix</h2>
          {category ? (
            <p className="mt-1 text-xs text-ink-muted">All orders in this window — payment is per order, not per category.</p>
          ) : null}
          {byMethod.size === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No orders in this window.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {[...byMethod.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([method, count]) => {
                  const pct = Math.round((count / valid.length) * 100);
                  return (
                    <li key={method}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-ink">
                          {method === "cod" ? "Cash on delivery" : method}
                        </span>
                        <span className="tabular text-ink-muted">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}

          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-4 text-ink-muted">
            Cost of goods only counts products with a cost recorded. Set{" "}
            <Badge>Your cost</Badge> on a product to include it here.
          </p>
        </Card>
      </div>
    </>
  );
}
