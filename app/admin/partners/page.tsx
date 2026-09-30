import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { PartnerRows, type PartnerRow } from "@/components/admin/partner-rows";

export const dynamic = "force-dynamic";

const TABS = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["all", "All"],
] as const;

/** Applications from the storefront's "Become a partner" form. */
export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("customers");
  const { status: raw } = await searchParams;
  const status = TABS.some(([k]) => k === raw) ? (raw as string) : "new";

  const db = createAdminClient();
  let q = db
    .from("partner_applications")
    .select(
      "id, user_id, store_name, first_name, last_name, email, phone, partner_type, city, message, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  const rows = (data ?? []) as PartnerRow[];

  return (
    <>
      <PageHeader
        title="Partner applications"
        description="Shops, companies and affiliates who applied through “Become a Partner” in the menu."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={key === "new" ? "/admin/partners" : `/admin/partners?status=${key}`}
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
            title={status === "new" ? "No new applications" : "Nothing here"}
            description="Applications appear here as soon as someone sends one."
          />
        </Card>
      ) : (
        <PartnerRows rows={rows} />
      )}
    </>
  );
}
