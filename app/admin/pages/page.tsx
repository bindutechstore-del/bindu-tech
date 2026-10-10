import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTENT_PAGES, withStoreName } from "@/lib/content/pages";
import { getStoreSettings } from "@/lib/queries/settings";
import { PageHeader, Card, Badge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/** Every information page, and whether the shop has rewritten it. */
export default async function AdminPagesPage() {
  await requirePermission("settings");
  const db = createAdminClient();
  const [{ data }, settings] = await Promise.all([
    db.from("content_pages").select("slug, title, updated_at"),
    getStoreSettings(),
  ]);
  const edited = new Map(
    ((data ?? []) as { slug: string; title: string; updated_at: string }[]).map((r) => [r.slug, r]),
  );
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });

  return (
    <>
      <PageHeader
        title="Pages"
        description="Your policy and information pages. Rewrite any of them in Bangla or English, with a coloured banner and warning / info boxes."
      />
      <Card className="divide-y divide-line">
        {CONTENT_PAGES.map((p) => {
          const row = edited.get(p.slug);
          const title = row?.title ?? withStoreName(p, settings.store_name).title;
          return (
            <div key={p.slug} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                  {title}
                  {row ? (
                    <Badge tone="success">Edited {when.format(new Date(row.updated_at))}</Badge>
                  ) : (
                    <Badge tone="neutral">Built-in text</Badge>
                  )}
                </p>
                <p className="text-xs text-ink-muted">/{p.slug}</p>
              </div>
              <Link
                href={`/${p.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
              >
                View <ExternalLink size={13} />
              </Link>
              <Link
                href={`/admin/pages/${p.slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Pencil size={14} />
                Edit
              </Link>
            </div>
          );
        })}
      </Card>
    </>
  );
}
