import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { RequestRows, type ProductRequestRow } from "@/components/admin/request-rows";

export const dynamic = "force-dynamic";

const TABS = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["sourced", "Sourced"],
  ["closed", "Closed"],
  ["all", "All"],
] as const;

/**
 * Product requests from the storefront menu's "Request a Product" form:
 * what shoppers are looking for that the shop does not stock yet.
 */
export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("products");
  const { status: raw } = await searchParams;
  const status = TABS.some(([k]) => k === raw) ? (raw as string) : "new";

  const db = createAdminClient();
  let q = db
    .from("product_requests")
    .select(
      "id, name, email, phone, quantity, product_name, description, expected_price_paisa, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  const rows = (data ?? []) as ProductRequestRow[];

  return (
    <>
      <PageHeader
        title="Product requests"
        description="What shoppers asked for through “Request a Product” in the menu."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={key === "new" ? "/admin/requests" : `/admin/requests?status=${key}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              status === key
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-line bg-surface text-ink-soft hover:border-brand-600"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={status === "new" ? "No new requests" : "Nothing here"}
            description="Requests appear here as soon as a shopper sends one."
          />
        </Card>
      ) : (
        <RequestRows rows={rows} />
      )}
    </>
  );
}
