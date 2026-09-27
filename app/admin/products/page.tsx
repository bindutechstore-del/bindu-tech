import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { listAdminProducts, getCategoryNames } from "@/lib/queries/admin";
import { loadMoreAdminProducts } from "@/lib/actions/admin-lists";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ProductRows } from "@/components/admin/product-rows";
import { LoadMoreRows } from "@/components/admin/load-more-rows";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const [{ rows, total, nextPage }, categoryName] = await Promise.all([
    listAdminProducts({ q, status }),
    getCategoryNames(),
  ]);

  // Echoed back to the load-more action so appended pages keep these filters.
  const listQuery = new URLSearchParams(
    Object.entries({ q, status }).filter(
      (e): e is [string, string] => Boolean(e[1]),
    ),
  ).toString();

  const filters = [
    ["all", "All"],
    ["active", "Active"],
    ["draft", "Draft"],
    ["archived", "Archived"],
  ] as const;

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} ${total === 1 ? "product" : "products"}. Margin is visible here because admin reads run as the service role.`}
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus />
              New product
            </Link>
          </Button>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <form className="flex flex-1 gap-2" action="/admin/products">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or SKU…"
            className="h-9 min-w-40 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
          />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>

        <div className="flex gap-1">
          {filters.map(([value, label]) => (
            <Link
              key={value}
              href={`/admin/products?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                (status ?? "all") === value
                  ? "bg-brand-600 text-white"
                  : "text-ink-soft hover:bg-surface-sunken"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package size={30} />}
          title="No products match"
          description="Try a different search, or add your first product."
          action={
            <Button asChild>
              <Link href="/admin/products/new">Add a product</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-200 text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 text-right font-medium">Price</th>
                <th className="px-3 py-3 text-right font-medium">Margin</th>
                <th className="px-3 py-3 text-right font-medium">Stock</th>
                <th className="px-3 py-3 text-right font-medium">Sold</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <ProductRows rows={rows} categoryName={categoryName} />
            </tbody>

            {/* Pages 2..n arrive as the user scrolls, rendered on the server
                by the same ProductRows component. */}
            <LoadMoreRows
              // Remount when the list changes (a delete lowers the total):
              // rows already loaded from page 2+ would otherwise stay on
              // screen after their product was gone, or shift by one.
              key={`${listQuery}|${total}`}
              action={loadMoreAdminProducts}
              query={listQuery}
              initialNextPage={nextPage}
              colSpan={8}
            />
          </table>
        </Card>
      )}
    </>
  );
}
