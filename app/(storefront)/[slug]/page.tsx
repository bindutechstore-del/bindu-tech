import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MessageCircle } from "lucide-react";
import { CONTENT_PAGES, getContentPage, withStoreName } from "@/lib/content/pages";
import { getDeliveryZones, getStoreSettings } from "@/lib/queries/settings";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatTaka } from "@/lib/utils/money";

/**
 * Policy and information pages, rendered from lib/content/pages.ts.
 *
 * This is a single-segment catch-all, so it only ever matches paths that no
 * static route claimed — /cart, /products, /sign-in and friends all win first.
 * Anything not in the registry 404s.
 */
export function generateStaticParams() {
  return CONTENT_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const raw = getContentPage(slug);
  if (!raw) return { title: "Not found" };
  const page = withStoreName(raw, (await getStoreSettings()).store_name);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function ContentPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raw = getContentPage(slug);
  if (!raw) notFound();

  const [settings, zones] = await Promise.all([
    getStoreSettings(),
    raw.showDeliveryTable ? getDeliveryZones() : Promise.resolve([]),
  ]);
  const page = withStoreName(raw, settings.store_name);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{page.title}</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-ink">{page.title}</h1>
      {page.intro ? (
        <p className="mt-3 text-base leading-7 text-ink-soft">{page.intro}</p>
      ) : null}

      {page.showDeliveryTable && zones.length > 0 ? (
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

      <div className="mt-8 space-y-8">
        {page.sections.map((section, i) => (
          <section key={section.heading ?? i}>
            {section.heading ? (
              <h2 className="text-lg font-bold tracking-tight text-ink">
                {section.heading}
              </h2>
            ) : null}

            {section.body?.map((p, j) => (
              <p key={j} className="mt-2 text-[15px] leading-7 text-ink-soft">
                {p}
              </p>
            ))}

            {section.points ? (
              <ul className="mt-3 space-y-2">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2 text-[15px] leading-7 text-ink-soft">
                    <Check size={17} className="mt-1.5 shrink-0 text-success" />
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}

            {section.faqs ? (
              <div className="space-y-2">
                {section.faqs.map((f) => (
                  <details
                    key={f.q}
                    className="group rounded-xl border border-line bg-surface p-4 open:shadow-card"
                  >
                    <summary className="cursor-pointer list-none text-[15px] font-medium text-ink marker:content-none">
                      <span className="flex items-start justify-between gap-3">
                        {f.q}
                        <span className="mt-1 shrink-0 text-ink-faint transition-transform group-open:rotate-45">
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-2.5 text-[15px] leading-7 text-ink-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            ) : null}
          </section>
        ))}
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
