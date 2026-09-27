"use client";

import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Timer, Plus, Pencil, Trash2, X } from "lucide-react";
import {
  saveFlashSale,
  deleteFlashSale,
  saveFlashSaleItem,
  removeFlashSaleItem,
  type FlashSaleState,
  type PromotionProduct,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";
import { Card, Badge } from "@/components/ui/primitives";
import { formatTaka, discountPercent } from "@/lib/utils/money";
import { ProductSearchPicker } from "./product-search-picker";

export interface FlashSaleRow {
  id: string;
  title: string;
  subtitle: string;
  /** "YYYY-MM-DDTHH:mm" in Bangladesh time. */
  startsInput: string;
  endsInput: string;
  isActive: boolean;
  status: "live" | "scheduled" | "ended" | "off";
  items: {
    id: string;
    productId: string;
    name: string;
    regularPaisa: number;
    salePaisa: number;
    stockLimit: number | null;
    sold: number;
  }[];
}

const STATUS: Record<FlashSaleRow["status"], { label: string; tone: "success" | "brand" | "neutral" | "warning" }> = {
  live: { label: "Live now", tone: "success" },
  scheduled: { label: "Scheduled", tone: "brand" },
  ended: { label: "Ended", tone: "neutral" },
  off: { label: "Switched off", tone: "warning" },
};

const initial: FlashSaleState = { ok: false };

/**
 * Flash sales: the homepage "Deals" row with the countdown.
 *
 * A sale that is switched on and inside its window shows on the homepage with
 * a live countdown, and its products are charged the sale price in the cart
 * (by SQL, not here) until each one's unit limit is sold.
 */
export function FlashSaleManager({ sales }: { sales: FlashSaleRow[] }) {
  // null = closed, "new" = creating, an id = editing that sale.
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();
  const router = useRouter();
  const current = sales.find((s) => s.id === editing) ?? null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Timer size={16} className="text-danger" />
        <h2 className="text-sm font-semibold text-ink">Flash sale — homepage countdown</h2>
        {editing === null ? (
          <Button size="sm" className="ml-auto" onClick={() => setEditing("new")}>
            <Plus size={15} />
            New flash sale
          </Button>
        ) : null}
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        While a sale is on and its time has not run out, the homepage shows its products with
        a countdown, and the cart charges the sale price until each product&apos;s units are sold.
        Times are Bangladesh time.
      </p>

      {editing !== null && editing !== "new" && !current ? (
        // Just created: the refreshed list (with this sale) is on its way.
        // Waiting keeps the editor from mounting with empty defaults.
        <p className="mt-4 text-sm text-ink-muted">Opening the new sale…</p>
      ) : editing !== null ? (
        <SaleEditor
          key={editing}
          sale={current}
          onClose={() => setEditing(null)}
          onCreated={(id) => {
            setEditing(id);
            router.refresh();
          }}
        />
      ) : null}

      <ul className="mt-4 space-y-2">
        {sales.length === 0 ? (
          <li className="text-sm text-ink-muted">No flash sales yet.</li>
        ) : (
          sales.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink">{s.title}</span>
                  <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                </span>
                <span className="block text-xs text-ink-muted tabular">
                  {s.startsInput.replace("T", " ")} → {s.endsInput.replace("T", " ")} ·{" "}
                  {s.items.length} {s.items.length === 1 ? "product" : "products"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setEditing(s.id)}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                aria-label={`Edit ${s.title}`}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  if (!confirm(`Delete the flash sale “${s.title}”?`)) return;
                  startRemove(async () => {
                    const r = await deleteFlashSale(s.id);
                    if (!r.ok) toast.error(r.error ?? "Could not delete.");
                    else {
                      toast.success(r.message ?? "Deleted.");
                      if (editing === s.id) setEditing(null);
                      router.refresh();
                    }
                  });
                }}
                className="rounded-md p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger"
                aria-label={`Delete ${s.title}`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}

function SaleEditor({
  sale,
  onClose,
  onCreated,
}: {
  sale: FlashSaleRow | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [state, action, pending] = useActionState(saveFlashSale, initial);
  const router = useRouter();
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!state.ok) return;
    toast.success(state.message ?? "Saved.");
    if (!sale && state.id) onCreated(state.id);
    else router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-sunken/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">
          {sale ? `Edit “${sale.title}”` : "New flash sale"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-ink-muted hover:bg-surface hover:text-ink"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <form
        action={action}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="mt-3 grid gap-3 sm:grid-cols-2"
      >
        {sale ? <input type="hidden" name="id" value={sale.id} /> : null}
        <Field label="Title" htmlFor="fs-title" required error={errors.title}>
          <Input id="fs-title" name="title" required defaultValue={sale?.title ?? ""} placeholder="e.g. Weekend flash sale" />
        </Field>
        <Field label="Subtitle" htmlFor="fs-subtitle" error={errors.subtitle}>
          <Input id="fs-subtitle" name="subtitle" defaultValue={sale?.subtitle ?? ""} placeholder="e.g. Up to 40% off, while stocks last" />
        </Field>
        <Field label="Starts" htmlFor="fs-start" required error={errors.starts_at}>
          <Input id="fs-start" name="starts_at" type="datetime-local" required defaultValue={sale?.startsInput ?? ""} />
        </Field>
        <Field label="Ends (the countdown runs to this)" htmlFor="fs-end" required error={errors.ends_at}>
          <Input id="fs-end" name="ends_at" type="datetime-local" required defaultValue={sale?.endsInput ?? ""} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={sale ? sale.isActive : true}
            className="size-4 accent-brand-600"
          />
          Switched on
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" size="sm" loading={pending}>
            {sale ? "Save sale" : "Create sale"}
          </Button>
          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}
        </div>
      </form>

      {sale ? <SaleItems sale={sale} /> : (
        <p className="mt-3 text-xs text-ink-muted">Create the sale first, then add its products here.</p>
      )}
    </div>
  );
}

function SaleItems({ sale }: { sale: FlashSaleRow }) {
  const [product, setProduct] = useState<PromotionProduct[]>([]);
  const [price, setPrice] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, startBusy] = useTransition();
  const router = useRouter();
  const chosen = product[0] ?? null;

  const add = () => {
    if (!chosen) return;
    startBusy(async () => {
      const r = await saveFlashSaleItem({
        saleId: sale.id,
        productId: chosen.id,
        salePriceTaka: Number(price),
        stockLimit: limit.trim() === "" ? null : Number(limit),
      });
      if (!r.ok) {
        toast.error(r.error ?? "Could not add.");
        return;
      }
      toast.success(r.message ?? "Added.");
      setProduct([]);
      setPrice("");
      setLimit("");
      router.refresh();
    });
  };

  return (
    <div className="mt-5 border-t border-line pt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Products in this sale
      </h4>

      {sale.items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">None yet — the sale will not show until it has products.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {sale.items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{i.name}</span>
              <span className="tabular text-xs text-ink-faint line-through">{formatTaka(i.regularPaisa)}</span>
              <span className="tabular font-semibold text-danger">{formatTaka(i.salePaisa)}</span>
              {i.regularPaisa > 0 ? (
                <Badge tone="neutral">−{discountPercent(i.salePaisa, i.regularPaisa)}%</Badge>
              ) : null}
              <span className="text-xs text-ink-muted tabular">
                {i.sold} sold{i.stockLimit ? ` of ${i.stockLimit}` : ""}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  startBusy(async () => {
                    const r = await removeFlashSaleItem(i.id);
                    if (!r.ok) toast.error(r.error ?? "Could not remove.");
                    else router.refresh();
                  })
                }
                className="rounded-md p-1 text-ink-muted hover:bg-danger-soft hover:text-danger"
                aria-label={`Remove ${i.name} from the sale`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_130px_130px_auto] sm:items-end">
        <div>
          <span className="mb-1 block text-xs font-medium text-ink-muted">Add a product</span>
          <ProductSearchPicker name="fs_product" value={product} onChange={setProduct} />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">
            Sale price (৳){chosen ? ` — now ${formatTaka(chosen.price_paisa)}` : ""}
          </span>
          <Input
            type="number"
            min={1}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Units (optional)</span>
          <Input
            type="number"
            min={1}
            step="1"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="No limit"
          />
        </label>
        <Button type="button" size="sm" onClick={add} loading={busy} disabled={!chosen || !price}>
          <Plus size={15} />
          Add
        </Button>
      </div>
    </div>
  );
}
