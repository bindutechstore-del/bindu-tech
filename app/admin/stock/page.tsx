import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { StockTable } from "@/components/admin/stock-table";
import { PageHeader, Card } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  await requirePermission("stock");
  const db = createAdminClient();

  const { data } = await db
    .from("products")
    .select("id, name, sku, stock, low_stock_threshold, status, thumbnail_url, has_variants")
    .neq("status", "archived")
    .order("stock", { ascending: true })
    .limit(300);

  const rows = (data ?? []) as {
    id: string;
    name: string;
    sku: string;
    stock: number;
    low_stock_threshold: number;
    status: string;
    thumbnail_url: string | null;
    has_variants: boolean;
  }[];

  const out = rows.filter((r) => r.stock === 0).length;
  const low = rows.filter(
    (r) => r.stock > 0 && r.stock <= r.low_stock_threshold,
  ).length;

  return (
    <>
      <PageHeader
        title="Stock"
        description="Edit a number and it saves immediately. Variant stock rolls up automatically."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Out of stock</p>
          <p className="mt-1 text-2xl font-bold tabular text-danger">{out}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Running low</p>
          <p className="mt-1 text-2xl font-bold tabular text-warning">{low}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Tracked products</p>
          <p className="mt-1 text-2xl font-bold tabular text-ink">{rows.length}</p>
        </Card>
      </div>

      <StockTable rows={rows} />
    </>
  );
}
