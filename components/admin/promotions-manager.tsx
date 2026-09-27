"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Trash2, Plus, Package, Layers } from "lucide-react";
import {
  saveQuantityBreak,
  deleteQuantityBreak,
  saveBundle,
  deleteBundle,
  type AdminState,
  type PromotionProduct,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { ProductSearchPicker } from "./product-search-picker";

const initial: AdminState = { ok: false };

/**
 * Submit without React 19's automatic form reset, which also fires on a
 * FAILED save and would throw away the numbers just typed. After a
 * successful save the form is cleared on purpose (see the effects below).
 */
function submitKeepingFields(
  action: (fd: FormData) => void,
): React.FormEventHandler<HTMLFormElement> {
  return (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };
}

export interface PickerCategory {
  id: string;
  name: string;
}

export interface BreakRow {
  id: string;
  min_quantity: number;
  discount_percent: number;
  target: string;
  scope: "product" | "category";
}

export interface BundleRow {
  id: string;
  name: string;
  discount_percent: number;
  products: string[];
}

/**
 * The two promotion shapes in one screen, because an operator thinks of them
 * together: "how do I discount this?" — by volume, or by combination.
 */
export function PromotionsManager({
  breaks,
  bundles,
  categories,
}: {
  breaks: BreakRow[];
  bundles: BundleRow[];
  categories: PickerCategory[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <QuantityBreaks rows={breaks} categories={categories} />
      <Bundles rows={bundles} />
    </div>
  );
}

function QuantityBreaks({
  rows,
  categories,
}: {
  rows: BreakRow[];
  categories: PickerCategory[];
}) {
  const [state, action, pending] = useActionState(saveQuantityBreak, initial);
  const [scope, setScope] = useState<"product" | "category">("product");
  const [product, setProduct] = useState<PromotionProduct[]>([]);
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setProduct([]);
  }, [state]);

  const missingTarget = scope === "product" && product.length === 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Package size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-ink">Buy more, save more</h2>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        Buy N or more and that line is discounted. A rule on a product beats a
        rule on its category.
      </p>

      <form
        ref={formRef}
        action={action}
        onSubmit={submitKeepingFields(action)}
        className="mt-4 space-y-3"
      >
        <div className="flex gap-2">
          {(["product", "category"] as const).map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm capitalize text-ink">
              <input
                type="radio"
                name="scope"
                value={s}
                checked={scope === s}
                onChange={() => setScope(s)}
                className="size-4 accent-brand-600"
              />
              {s}
            </label>
          ))}
        </div>

        {scope === "product" ? (
          <ProductSearchPicker name="target_id" value={product} onChange={setProduct} />
        ) : (
          <select
            name="target_id"
            required
            className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
          >
            <option value="">Choose a category…</option>
            {categories.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">
              Minimum quantity
            </span>
            <input
              name="min_quantity"
              type="number"
              min={2}
              defaultValue={3}
              required
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">
              Discount %
            </span>
            <input
              name="discount_percent"
              type="number"
              min={1}
              max={90}
              step={0.5}
              defaultValue={10}
              required
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
            />
          </label>
        </div>

        <Button type="submit" size="sm" loading={pending} disabled={missingTarget}>
          <Plus size={15} />
          Add rule
        </Button>

        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : state.ok && state.message ? (
          <p className="text-sm text-success">{state.message}</p>
        ) : null}
      </form>

      <div className="mt-5 border-t border-line pt-4">
        {rows.length === 0 ? (
          <p className="text-sm text-ink-muted">No quantity rules yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{r.target}</span>
                  <span className="text-xs text-ink-muted">
                    {r.scope === "category" ? "Category · " : ""}
                    Buy {r.min_quantity}+ · {r.discount_percent}% off
                  </span>
                </span>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => startRemove(async () => void (await deleteQuantityBreak(r.id)))}
                  className="shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger"
                  aria-label={`Remove rule for ${r.target}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Bundles({ rows }: { rows: BundleRow[] }) {
  const [state, action, pending] = useActionState(saveBundle, initial);
  const [picked, setPicked] = useState<PromotionProduct[]>([]);
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setPicked([]);
  }, [state]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-ink">Bundle offers</h2>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        Hold every product in the set and the set is discounted. The cut comes
        off those lines only.
      </p>

      <form
        ref={formRef}
        action={action}
        onSubmit={submitKeepingFields(action)}
        className="mt-4 space-y-3"
      >
        <input
          name="name"
          required
          placeholder="e.g. Desk Starter Pack"
          className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
        />

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">
            Discount % off the bundle
          </span>
          <input
            name="discount_percent"
            type="number"
            min={1}
            max={90}
            step={0.5}
            defaultValue={10}
            required
            className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium text-ink-muted">
            Products in the bundle (two or more)
          </span>
          <ProductSearchPicker
            name="product_ids"
            multiple
            value={picked}
            onChange={setPicked}
            placeholder="Search and add products…"
          />
        </div>

        <Button type="submit" size="sm" loading={pending} disabled={picked.length < 2}>
          <Plus size={15} />
          Create bundle{picked.length ? ` (${picked.length})` : ""}
        </Button>

        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : state.ok && state.message ? (
          <p className="text-sm text-success">{state.message}</p>
        ) : null}
      </form>

      <div className="mt-5 border-t border-line pt-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Layers size={26} />}
            title="No bundles yet"
            description="Pick two or more products above to make one."
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((b) => (
              <li
                key={b.id}
                className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">
                    {b.name} · {b.discount_percent}% off
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {b.products.join(" + ")}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => startRemove(async () => void (await deleteBundle(b.id)))}
                  className="shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger"
                  aria-label={`Remove ${b.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
