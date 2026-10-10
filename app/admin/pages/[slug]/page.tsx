import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getContentPage, withStoreName } from "@/lib/content/pages";
import { blocksFromPage } from "@/lib/content/blocks";
import { getPageOverride } from "@/lib/queries/content";
import { getStoreSettings } from "@/lib/queries/settings";
import { PageHeader } from "@/components/ui/primitives";
import { PageEditor } from "@/components/admin/page-editor";

export const dynamic = "force-dynamic";

/**
 * Edit one information page. Starts from the saved version, or — the first
 * time — from the built-in text, so nothing has to be retyped.
 */
export default async function EditContentPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePermission("settings");
  const { slug } = await params;
  const raw = getContentPage(slug);
  if (!raw) notFound();

  const [settings, override] = await Promise.all([getStoreSettings(), getPageOverride(slug)]);
  const builtIn = withStoreName(raw, settings.store_name);

  return (
    <>
      <Link
        href="/admin/pages"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} />
        All pages
      </Link>
      <PageHeader title={`Edit: ${override?.title ?? builtIn.title}`} description={`bindu.tech/${slug}`} />
      <PageEditor
        slug={slug}
        edited={Boolean(override)}
        initial={
          override ?? {
            title: builtIn.title,
            subtitle: builtIn.intro ?? "",
            description: builtIn.description,
            bannerColor: "",
            blocks: blocksFromPage(builtIn),
          }
        }
      />
    </>
  );
}
