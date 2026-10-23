"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Ruler, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { Input } from "@/components/ui/field";
import type { ProductVariant } from "@/types/database";

export interface EditorRow {
  key: number;
  id?: string;
  size: string;
  color: string;
  stock: string;
  price: string;
  active: boolean;
}

const PRESETS: { label: string; sizes: string[] }[] = [
  { label: "Clothing XS–XXL", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Shoes 38–44", sizes: ["38", "39", "40", "41", "42", "43", "44"] },
  { label: "Free size", sizes: ["Free size"] },
];

/**
 * "Sizes & options" on the product form.
 *
 * Fashion products (the category is Fashion or under it) open with this
 * expanded and the size presets offered; anything else can still add
 * options (a colour, say) from a single button. The rows travel to the save
 * action as JSON in `variants_json`; `variants__on` tells it the editor was on
 * the form, so an old tab without it can never wipe a product's sizes.
 */
export function VariantEditor({
  initial,
  isFashion,
  onTotalChange,
}: {
  initial: ProductVariant[];
  isFashion: boolean;
  /** Total stock across active rows, or null when there are no rows. */
  onTotalChange: (total: number | null) => void;
}) {
  const nextKey = useRef(0);
  const [rows, setRows] = useState<EditorRow[]>(() =>
    initial.map((v) => ({
      key: nextKey.current++,
      id: v.id,
      size: v.attributes?.size ?? (v.attributes?.color ? "" : v.name),
      color: v.attributes?.color ?? "",
      stock: String(v.stock),
      price: v.price_paisa != null ? String(v.price_paisa / 100) : "",
      active: v.is_active,
    })),
  );
  const [open, setOpen] = useState(isFashion || initial.length > 0);
  useEffect(() => {
    if (isFashion) setOpen(true);
  }, [isFashion]);

  const total = rows.reduce((s, r) => s + (r.active ? Number(r.stock) || 0 : 0), 0);
  useEffect(() => {
    onTotalChange(rows.length ? total : null);
  }, [rows.length, total, onTotalChange]);

  const blank = (size = ""): EditorRow => ({ key: nextKey.current++, size, color: "", stock: "0", price: "", active: true });
  const addSizes = (sizes: string[]) =>
    setRows((all) => {
      const have = new Set(all.map((r) => `${r.size.toLowerCase()}|${r.color.toLowerCase()}`));
      return [...all, ...sizes.filter((s) => !have.has(`${s.toLowerCase()}|`)).map((s) => blank(s))];
    });
  const update = (key: number, patch: Partial<EditorRow>) =>
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: number) => setRows((all) => all.filter((r) => r.key !== key));

  const payload = JSON.stringify(
    rows.map((r) => ({
      id: r.id ?? "",
      size: r.size,
      color: r.color,
      stock: r.stock === "" ? 0 : Number(r.stock),
      price: r.price,
      active: r.active,
    })),
  );

  return (
    <Card className="p-5">
      <input type="hidden" name="variants__on" value="1" />
      <input type="hidden" name="variants_json" value={payload} />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Ruler size={16} className="text-brand-600" />
            Sizes &amp; options
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {isFashion
              ? "Fashion item: list each size you sell with its stock. Customers must pick one."
              : "Optional — sizes or colours, each with its own stock. Customers must pick one."}
          </p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-brand-600 hover:text-brand-700"
          >
            <Plus size={14} />
            Add sizes or options
          </button>
        ) : null}
      </div>

      {open ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => addSizes(p.sizes)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-600 hover:text-brand-700"
              >
                <Plus size={13} />
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRows((all) => [...all, blank()])}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-600 hover:text-brand-700"
            >
              <Plus size={13} />
              One row
            </button>
          </div>

          {rows.length > 0 ? (
            <div className="mt-4 space-y-2">
              <div className="hidden grid-cols-[1fr_1fr_5.5rem_6.5rem_3.5rem_2rem] gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint sm:grid">
                <span>Size</span>
                <span>Colour (optional)</span>
                <span>Stock</span>
                <span>Price ৳ (optional)</span>
                <span>Selling</span>
                <span />
              </div>
              {rows.map((r) => (
                <div
                  key={r.key}
                  className={`grid grid-cols-2 gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_1fr_5.5rem_6.5rem_3.5rem_2rem] sm:items-center sm:border-0 sm:p-0 ${
                    r.active ? "" : "opacity-60"
                  }`}
                >
                  <Input
                    value={r.size}
                    maxLength={40}
                    placeholder="e.g. M, 42"
                    aria-label="Size"
                    onChange={(e) => update(r.key, { size: e.target.value })}
                  />
                  <Input
                    value={r.color}
                    maxLength={40}
                    placeholder="e.g. Black"
                    aria-label="Colour"
                    onChange={(e) => update(r.key, { color: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={r.stock}
                    aria-label="Stock"
                    onChange={(e) => update(r.key, { stock: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.price}
                    placeholder="Same"
                    aria-label="Price for this size (optional)"
                    onChange={(e) => update(r.key, { price: e.target.value })}
                  />
                  <label className="flex items-center gap-1.5 text-xs text-ink-soft sm:justify-center">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={(e) => update(r.key, { active: e.target.checked })}
                      className="size-4 accent-brand-600"
                      aria-label="Selling this size"
                    />
                    <span className="sm:sr-only">Selling</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(r.key)}
                    aria-label={`Remove ${r.size || r.color || "row"}`}
                    className="inline-flex size-8 items-center justify-center justify-self-end rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <p className="pt-1 text-xs text-ink-muted">
                Total stock: <strong className="tabular text-ink">{total}</strong>. Leave a price
                empty to use the product&apos;s price. Untick “Selling” to hide a size for now.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-muted">
              Tap a preset above, or “One row” to type your own (for example a colour).
            </p>
          )}
        </>
      ) : null}
    </Card>
  );
}
