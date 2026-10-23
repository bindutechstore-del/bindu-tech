"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { adjustStock } from "@/lib/actions/admin";
import { Card, Badge } from "@/components/ui/primitives";
import { Input } from "@/components/ui/field";

interface Row {
  id: string;
  name: string;
  sku: string;
  stock: number;
  low_stock_threshold: number;
  status: string;
  thumbnail_url: string | null;
  /** Stock is kept per size; the figure here is their total. */
  has_variants: boolean;
}

/**
 * Inline stock editing. Saves on blur or Enter rather than behind a Save
 * button, because the common case is correcting a dozen counts after a
 * stocktake.
 */
export function StockTable({ rows }: { rows: Row[] }) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((r) => [r.id, r.stock])),
  );
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function commit(row: Row) {
    const next = values[row.id];
    if (next === undefined || next === row.stock) return;

    start(async () => {
      const result = await adjustStock(row.id, next);
      if (!result.ok) {
        toast.error(result.error ?? "Could not update stock.");
        setValues((v) => ({ ...v, [row.id]: row.stock }));
        return;
      }
      setSaved(row.id);
      setTimeout(() => setSaved((s) => (s === row.id ? null : s)), 1500);
    });
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-150 text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-3 py-3 font-medium">SKU</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 text-right font-medium">Alert at</th>
            <th className="px-4 py-3 text-right font-medium">In stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-surface-sunken">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken">
                    {r.thumbnail_url ? (
                      <Image
                        src={r.thumbnail_url}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <Link
                    href={`/admin/products/${r.id}`}
                    className="clamp-2 font-medium text-ink hover:text-brand-700"
                  >
                    {r.name}
                  </Link>
                </div>
              </td>

              <td className="px-3 py-2.5 text-xs text-ink-muted tabular">{r.sku}</td>

              <td className="px-3 py-2.5">
                <Badge
                  tone={
                    r.stock === 0
                      ? "danger"
                      : r.stock <= r.low_stock_threshold
                        ? "warning"
                        : "success"
                  }
                >
                  {r.stock === 0
                    ? "Out of stock"
                    : r.stock <= r.low_stock_threshold
                      ? "Low"
                      : "In stock"}
                </Badge>
              </td>

              <td className="px-3 py-2.5 text-right tabular text-ink-muted">
                {r.low_stock_threshold}
              </td>

              <td className="px-4 py-2.5">
                <div className="flex items-center justify-end gap-1.5">
                  {saved === r.id ? (
                    <Check size={15} className="text-success" aria-label="Saved" />
                  ) : null}
                  {r.has_variants ? (
                    // Sold in sizes: the total follows the sizes, so it is
                    // changed there, not overwritten here.
                    <span className="flex items-center gap-2 text-sm">
                      <span className="tabular font-medium text-ink">{r.stock}</span>
                      <Link href={`/admin/products/${r.id}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                        Edit sizes
                      </Link>
                    </span>
                  ) : (
                  <Input
                    type="number"
                    min="0"
                    value={values[r.id] ?? 0}
                    disabled={pending}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [r.id]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    onBlur={() => commit(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="h-8 w-20 text-right text-sm tabular"
                    aria-label={`Stock for ${r.name}`}
                  />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
