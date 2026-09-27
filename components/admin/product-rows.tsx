import Link from "next/link";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { ProductStatusToggle } from "@/components/admin/product-status-toggle";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { formatTaka } from "@/lib/utils/money";
import type { AdminProductRow } from "@/lib/queries/admin";

/**
 * Rows for the admin product table.
 *
 * Split out of the page so the scroll-loader can render the same markup for
 * pages 2..n on the server and stream them in — one definition, no duplicated
 * client-side copy of the row.
 */
export function ProductRows({
  rows,
  categoryName,
}: {
  rows: AdminProductRow[];
  categoryName: Map<string, string>;
}) {
  return (
    <>
      {rows.map((p) => {
        const margin = p.cost_paisa != null ? p.price_paisa - p.cost_paisa : null;
        const marginPct =
          margin != null && p.price_paisa > 0
            ? Math.round((margin / p.price_paisa) * 100)
            : null;

        return (
          <tr key={p.id} className="hover:bg-surface-sunken">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2.5">
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
                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="clamp-2 font-medium text-ink hover:text-brand-700"
                  >
                    {p.name}
                  </Link>
                  <p className="text-[11px] text-ink-faint tabular">{p.sku}</p>
                </div>
              </div>
            </td>

            <td className="px-3 py-3 text-xs text-ink-muted">
              {p.category_id ? (categoryName.get(p.category_id) ?? "—") : "—"}
            </td>

            <td className="px-3 py-3 text-right tabular">
              <span className="font-medium text-ink">{formatTaka(p.price_paisa)}</span>
              {p.compare_at_paisa ? (
                <span className="block text-[11px] text-ink-faint line-through">
                  {formatTaka(p.compare_at_paisa)}
                </span>
              ) : null}
            </td>

            <td className="px-3 py-3 text-right tabular">
              {margin != null ? (
                <>
                  <span
                    className={
                      margin > 0
                        ? "font-medium text-success"
                        : "font-medium text-danger"
                    }
                  >
                    {formatTaka(margin)}
                  </span>
                  <span className="block text-[11px] text-ink-faint">{marginPct}%</span>
                </>
              ) : (
                <span className="text-ink-faint">—</span>
              )}
            </td>

            <td className="px-3 py-3 text-right tabular">
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

            <td className="px-3 py-3 text-right tabular text-ink-muted">
              {p.units_sold}
            </td>

            <td className="px-3 py-3">
              <Badge
                tone={
                  p.status === "active"
                    ? "success"
                    : p.status === "draft"
                      ? "warning"
                      : "neutral"
                }
              >
                {p.status}
              </Badge>
            </td>

            <td className="px-4 py-3">
              <div className="flex justify-end gap-1">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil size={15} />
                </Link>
                <ProductStatusToggle id={p.id} status={p.status} />
                <DeleteProductButton id={p.id} name={p.name} />
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
