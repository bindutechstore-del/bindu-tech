"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProduct, type AdminState } from "@/lib/actions/admin";
import { paisaToTaka } from "@/lib/utils/money";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";
import type { Brand, Category, ProductAdmin, SpecItem } from "@/types/database";
import { ImageUploader } from "./image-uploader";
import { BrandPicker } from "./brand-picker";

const initial: AdminState = { ok: false };

/**
 * Product create/edit.
 *
 * Prices are typed in TAKA and converted to paisa server-side by
 * `takaToPaisa()` — an operator should never have to think in paisa, and the
 * browser should never be the thing doing the conversion that reaches the
 * database.
 */
export function ProductForm({
  product,
  categories,
  brands,
  images = [],
}: {
  product: ProductAdmin | null;
  categories: Category[];
  brands: Brand[];
  /** Gallery URLs in display order, for an existing product. */
  images?: string[];
}) {
  const [state, action, pending] = useActionState(saveProduct, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      router.push("/admin/products");
    }
  }, [state, router]);

  const specsText = ((product?.specifications ?? []) as SpecItem[])
    .map((s) => `${s.label}: ${s.value}`)
    .join("\n");

  return (
    <form
      // Submitted by hand in onSubmit. React 19 resets a form after every
      // action it runs — success OR failure — so a save refused for a
      // duplicate SKU wiped everything typed since the page loaded, and left
      // the controlled Brand list showing one brand while posting another.
      // Because onSubmit calls preventDefault, React neither runs `action`
      // again nor resets the form; `action` stays so a click before the page
      // has hydrated still POSTs to the server instead of GETting every field
      // (cost price included) into the URL. Browser validation still runs
      // first: onSubmit only fires for a valid form.
      action={action}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="grid gap-4 lg:grid-cols-[1fr_320px]"
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Basics</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Product name"
              htmlFor="name"
              required
              className="sm:col-span-2"
              error={state.fieldErrors?.name}
            >
              <Input
                id="name"
                name="name"
                required
                defaultValue={product?.name ?? ""}
                placeholder="Anker PowerCore 20,000mAh Power Bank"
                invalid={Boolean(state.fieldErrors?.name)}
              />
            </Field>

            <Field
              label="Slug"
              htmlFor="slug"
              hint="Leave blank to generate from the name"
              error={state.fieldErrors?.slug}
            >
              <Input id="slug" name="slug" defaultValue={product?.slug ?? ""} />
            </Field>

            <Field label="SKU" htmlFor="sku" required error={state.fieldErrors?.sku}>
              <Input
                id="sku"
                name="sku"
                required
                defaultValue={product?.sku ?? ""}
                invalid={Boolean(state.fieldErrors?.sku)}
              />
            </Field>

            <Field label="Category" htmlFor="category_id">
              <Select
                id="category_id"
                name="category_id"
                defaultValue={product?.category_id ?? ""}
              >
                <option value="">Uncategorised</option>
                {categories
                  .filter((c) => !c.parent_id)
                  .flatMap((m) => [m, ...categories.filter((c) => c.parent_id === m.id)])
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {/* Non-breaking spaces: browsers collapse ordinary leading spaces
                          inside an <option>. */}
                      {c.parent_id ? `\u00a0\u00a0\u00a0↳ ${c.name}` : c.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="Brand" htmlFor="brand_id">
              <BrandPicker brands={brands} defaultValue={product?.brand_id ?? ""} />
            </Field>

            <Field
              label="Short description"
              htmlFor="short_description"
              hint="One line, shown on cards and under the title"
              className="sm:col-span-2"
            >
              <Input
                id="short_description"
                name="short_description"
                maxLength={400}
                defaultValue={product?.short_description ?? ""}
              />
            </Field>

            <Field label="Full description" htmlFor="description" className="sm:col-span-2">
              <Textarea
                id="description"
                name="description"
                rows={7}
                defaultValue={product?.description ?? ""}
                placeholder="Blank lines become paragraphs on the product page."
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Pricing & stock</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Enter taka. Cost is staff-only and never leaves the server.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field
              label="Selling price (৳)"
              htmlFor="price"
              required
              error={state.fieldErrors?.price}
            >
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={paisaToTaka(product?.price_paisa)}
                invalid={Boolean(state.fieldErrors?.price)}
              />
            </Field>

            <Field
              label="Compare-at (৳)"
              htmlFor="compare_at"
              hint="Struck-through price"
              error={state.fieldErrors?.compare_at}
            >
              <Input
                id="compare_at"
                name="compare_at"
                type="number"
                step="0.01"
                min="0"
                defaultValue={paisaToTaka(product?.compare_at_paisa)}
                invalid={Boolean(state.fieldErrors?.compare_at)}
              />
            </Field>

            <Field label="Your cost (৳)" htmlFor="cost" hint="Drives the margin report">
              <Input
                id="cost"
                name="cost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={paisaToTaka(product?.cost_paisa)}
              />
            </Field>

            <Field label="Stock" htmlFor="stock" required>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                required
                defaultValue={product?.stock ?? 0}
              />
            </Field>

            <Field label="Low-stock alert at" htmlFor="low_stock_threshold">
              <Input
                id="low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                min="0"
                defaultValue={product?.low_stock_threshold ?? 5}
              />
            </Field>

            <Field
              label="Reward points"
              htmlFor="points_per_purchase"
              hint="Points a customer earns per unit, once the order is delivered"
            >
              <Input
                id="points_per_purchase"
                name="points_per_purchase"
                type="number"
                min="0"
                defaultValue={product?.points_per_purchase ?? 0}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Details</h2>

          <div className="mt-4 space-y-4">
            <Field
              label="Key features"
              htmlFor="features"
              hint="One per line — rendered as a ticked list"
            >
              <Textarea
                id="features"
                name="features"
                rows={5}
                defaultValue={(product?.features ?? []).join("\n")}
                placeholder={"22.5W fast charging\nGenuine 20,000mAh cells"}
              />
            </Field>

            <Field
              label="Specifications"
              htmlFor="specifications"
              hint="One per line, as “Label: value”"
            >
              <Textarea
                id="specifications"
                name="specifications"
                rows={6}
                defaultValue={specsText}
                placeholder={"Capacity: 20,000mAh\nOutput: 22.5W"}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Warranty" htmlFor="warranty">
                <Input
                  id="warranty"
                  name="warranty"
                  defaultValue={product?.warranty ?? ""}
                  placeholder="1 year official warranty"
                />
              </Field>

              <Field label="Delivery note" htmlFor="delivery_note">
                <Input
                  id="delivery_note"
                  name="delivery_note"
                  defaultValue={product?.delivery_note ?? ""}
                  placeholder="Bulky item — standard zone rate"
                />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Publishing</h2>

          <Field label="Status" htmlFor="status" className="mt-3">
            <Select id="status" name="status" defaultValue={product?.status ?? "draft"}>
              <option value="draft">Draft — hidden from the shop</option>
              <option value="active">Active — live on the storefront</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>

          <div className="mt-4 space-y-2.5">
            {/* Each tick puts the product in a homepage row, so say which. */}
            {[
              ["is_featured", "Featured", product?.is_featured, "Homepage “Handpicked for you”"],
              ["is_new_arrival", "New arrival", product?.is_new_arrival, "Homepage “New arrivals” row, and a New badge"],
              ["is_best_seller", "Best seller", product?.is_best_seller, "Homepage “Best sellers” row, most sold first"],
            ].map(([name, label, checked, hint]) => (
              <label
                key={String(name)}
                className="flex items-start gap-2 text-sm text-ink-soft"
              >
                <input
                  type="checkbox"
                  name={String(name)}
                  defaultChecked={Boolean(checked)}
                  className="mt-0.5 size-4 accent-brand-600"
                />
                <span>
                  {String(label)}
                  <span className="block text-[11px] text-ink-faint">{String(hint)}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Pictures</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Up to 8. Photos are resized before upload, so straight off a phone is
            fine. The first one is the main picture on cards and in search.
          </p>

          <div className="mt-3">
            <ImageUploader
              name="image_urls"
              folder="products"
              // Existing products keep their current pictures: the thumbnail
              // first, then any gallery images that are not a repeat of it.
              initial={[
                ...(product?.thumbnail_url ? [product.thumbnail_url] : []),
                ...(images ?? []).filter((u) => u !== product?.thumbnail_url),
              ]}
            />
          </div>

          <Field label="Video embed URL" htmlFor="video_url" className="mt-3">
            <Input
              id="video_url"
              name="video_url"
              type="url"
              defaultValue={product?.video_url ?? ""}
              placeholder="https://www.youtube.com/embed/…"
            />
          </Field>
        </Card>

        {state.error ? (
          <p
            role="alert"
            className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {state.error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" loading={pending} block>
            {product ? "Save changes" : "Create product"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
