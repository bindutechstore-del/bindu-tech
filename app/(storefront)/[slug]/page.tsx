import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { CONTENT_PAGES, getContentPage, withStoreName } from "@/lib/content/pages";
import { blocksFromPage } from "@/lib/content/blocks";
import { getPageOverride } from "@/lib/queries/content";
import { getDeliveryZones, getStoreSettings } from "@/lib/queries/settings";
import { PageBanner, PageBlocks } from "@/components/content/page-blocks";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatTaka } from "@/lib/utils/money";

/**
 * Information pages: About, FAQ, shipping, returns, warranty, privacy …
 *
 * The shop owner's own version from admin → Pages when there is one, else
 * the built-in text in lib/content/pages.ts. Both are drawn by the same block
 * renderer, so an edited page looks like the rest of the site.
 *
 * This is a single-segment catch-all, so it only ever matches paths that no
 * static route claimed — /cart, /products, /sign-in and friends all win first.
 * Anything not in the registry 404s.
 */
export function generateStaticParams() {
  return CONTENT_PAGES.map((p) => ({ slug: p.slug }));
}

async function loadPage(slug: string) {
  const raw = getContentPage(slug);
  if (!raw) return null;
  const [settings, override] = await Promise.all([getStoreSettings(), getPageOverride(slug)]);
  const builtIn = withStoreName(raw, settings.store_name);
  const content = override ?? {
    title: builtIn.title,
    subtitle: builtIn.intro ?? "",
    description: builtIn.description,
    bannerColor: "",
    blocks: blocksFromPage(builtIn),
  };
  return { raw, settings, content };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: page.content.title,
    description: page.content.description || page.content.subtitle.slice(0, 160) || undefined,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function ContentPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();
  const { raw, settings, content } = page;

  const zones = raw.showDeliveryTable ? await getDeliveryZones() : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{content.title}</span>
      </nav>

      <PageBanner title={content.title} subtitle={content.subtitle} color={content.bannerColor} />

      {raw.showDeliveryTable && zones.length > 0 ? (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full min-w-125 text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-3 py-3 text-right font-medium">Charge</th>
                <th className="px-3 py-3 text-right font-medium">Free above</th>
                <th className="px-4 py-3 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {zones.map((z) => (
                <tr key={z.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{z.name}</p>
                    <p className="clamp-2 text-[11px] text-ink-muted">
                      {z.districts.length > 0
                        ? z.districts.join(", ")
                        : "Everywhere else in Bangladesh"}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right tabular font-medium text-ink">
                    {formatTaka(z.fee_paisa)}
                  </td>
                  <td className="px-3 py-3 text-right tabular text-success">
                    {z.free_above_paisa ? formatTaka(z.free_above_paisa) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-ink-muted">
                    {z.min_days}–{z.max_days} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      <div className="mt-8">
        <PageBlocks blocks={content.blocks} />
      </div>

      <Card className="mt-10 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-base font-semibold text-ink">Still need a hand?</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {settings.support_hours} · {settings.support_phone}
          </p>
        </div>
        <Button asChild>
          <Link href="/contact">
            <MessageCircle />
            Contact us
          </Link>
        </Button>
      </Card>
    </div>
  );
}
