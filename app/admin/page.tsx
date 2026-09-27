import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Users,
  AlertTriangle,
  Star,
  Wallet,
} from "lucide-react";
import {
  getDashboardStats,
  getMonthlyMargin,
  getRevenueSeries,
  getBestSellers,
  getLowStock,
} from "@/lib/queries/admin";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { PageHeader, Card, Badge, Skeleton } from "@/components/ui/primitives";
import { StatsSkeleton, TableSkeleton } from "@/components/storefront/skeletons";
import { formatTaka, formatTakaCompact } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

/**
 * Each panel fetches its own data behind its own Suspense boundary.
 *
 * The dashboard used to await stats, the 30-day series, best sellers and low
 * stock together, so the slowest of the four decided when staff saw anything
 * at all. Now the KPI tiles land first and the chart and tables fill in behind
 * them. The queries still run concurrently — they just no longer block each
 * other's paint.
 */
export default async function AdminDashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything that changed today, and what needs your attention."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatsSkeleton count={7} />}>
          <StatTiles />
        </Suspense>

        {/* Margin is the only tile that scans order_items, so it streams in
            separately rather than delaying the seven cheap ones. */}
        <Suspense fallback={<StatsSkeleton count={1} />}>
          <MarginTile />
        </Suspense>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Revenue — last 30 days</h2>
          <p className="text-xs text-ink-muted">
            Excludes cancelled and returned orders.
          </p>
          <Suspense fallback={<Skeleton className="mt-4 h-56 w-full rounded-lg" />}>
            <RevenuePanel />
          </Suspense>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Best sellers</h2>
            <Link
              href="/admin/reports"
              className="text-xs text-brand-600 hover:text-brand-700"
            >
              Reports
            </Link>
          </div>
          <Suspense fallback={<Skeleton className="mt-3 h-44 w-full rounded-lg" />}>
            <BestSellersPanel />
          </Suspense>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Stock running low</h2>
          <Link
            href="/admin/stock"
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Manage stock
          </Link>
        </div>
        <div className="mt-3">
          <Suspense fallback={<TableSkeleton rows={5} />}>
            <LowStockPanel />
          </Suspense>
        </div>
      </Card>
    </>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof TrendingUp;
  tone: string;
  href?: string;
}) {
  const body = (
    <Card className="p-4 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <Icon size={16} className={tone} />
      </div>
      <p className="mt-2 text-2xl font-bold tabular tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>
    </Card>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

async function StatTiles() {
  const stats = await getDashboardStats();

  return (
    <>
      <StatTile
        label="Today's sales"
        value={formatTaka(stats.todayRevenuePaisa)}
        sub={`${stats.todayOrders} ${stats.todayOrders === 1 ? "order" : "orders"}`}
        icon={TrendingUp}
        tone="text-brand-600"
      />
      <StatTile
        label="This month"
        value={formatTakaCompact(stats.monthRevenuePaisa)}
        sub={`${stats.monthOrders} orders`}
        icon={ShoppingBag}
        tone="text-brand-600"
      />
      <StatTile
        label="Pending orders"
        value={String(stats.pendingOrders)}
        sub="Placed, confirmed or processing"
        icon={Clock}
        tone="text-warning"
        href="/admin/orders?status=placed"
      />
      <StatTile
        label="Delivered"
        value={String(stats.deliveredOrders)}
        sub="All time"
        icon={CheckCircle2}
        tone="text-success"
      />
      <StatTile
        label="Customers"
        value={String(stats.totalCustomers)}
        sub="Registered accounts"
        icon={Users}
        tone="text-ink"
        href="/admin/customers"
      />
      <StatTile
        label="Low stock"
        value={String(stats.lowStockCount)}
        sub="At or below threshold"
        icon={AlertTriangle}
        tone="text-danger"
        href="/admin/stock"
      />
      <StatTile
        label="Reviews to moderate"
        value={String(stats.pendingReviews)}
        sub="Awaiting approval"
        icon={Star}
        tone="text-warning"
        href="/admin/reviews"
      />
    </>
  );
}

async function MarginTile() {
  const { grossMarginPaisa, truncated, excludedLines } = await getMonthlyMargin();

  return (
    <StatTile
      label="Gross margin (month)"
      value={formatTakaCompact(grossMarginPaisa)}
      sub={
        truncated
          ? "Partial — first 5,000 lines this month"
          : excludedLines > 0
            ? `Excludes ${excludedLines} sold ${excludedLines === 1 ? "line" : "lines"} of deleted products`
            : "Revenue minus cost of goods"
      }
      icon={Wallet}
      tone="text-success"
    />
  );
}

async function RevenuePanel() {
  const series = await getRevenueSeries(30);
  return <RevenueChart data={series} />;
}

async function BestSellersPanel() {
  const bestSellers = await getBestSellers(6);

  if (bestSellers.length === 0) {
    return <p className="mt-4 text-sm text-ink-muted">No sales recorded yet.</p>;
  }

  return (
    <ul className="mt-3 space-y-3">
      {bestSellers.map((p) => (
        <li key={p.id} className="flex items-center gap-2.5">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken">
            {p.thumbnail_url ? (
              <Image
                src={p.thumbnail_url}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="clamp-2 text-xs font-medium leading-4 text-ink">{p.name}</p>
            <p className="text-[11px] text-ink-muted tabular">
              {p.units_sold} sold · {formatTaka(p.price_paisa)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function LowStockPanel() {
  const lowStock = await getLowStock(8);

  if (lowStock.length === 0) {
    return <p className="text-sm text-ink-muted">Nothing is running low.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-125 text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th className="pb-2 font-medium">Product</th>
            <th className="pb-2 font-medium">SKU</th>
            <th className="pb-2 text-right font-medium">Stock</th>
            <th className="pb-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lowStock.map((p) => (
            <tr key={p.id}>
              <td className="py-2.5">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="clamp-2 font-medium text-ink hover:text-brand-700"
                >
                  {p.name}
                </Link>
              </td>
              <td className="py-2.5 text-xs text-ink-muted tabular">{p.sku}</td>
              <td className="py-2.5 text-right tabular">
                <span
                  className={
                    p.stock === 0
                      ? "font-semibold text-danger"
                      : p.stock <= p.low_stock_threshold
                        ? "font-semibold text-warning"
                        : "text-ink"
                  }
                >
                  {p.stock}
                </span>
              </td>
              <td className="py-2.5 text-right">
                <Badge
                  tone={
                    p.stock === 0
                      ? "danger"
                      : p.stock <= p.low_stock_threshold
                        ? "warning"
                        : "success"
                  }
                >
                  {p.stock === 0
                    ? "Out of stock"
                    : p.stock <= p.low_stock_threshold
                      ? "Low"
                      : "OK"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
