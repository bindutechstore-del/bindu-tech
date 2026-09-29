"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Banner, BannerPlacement } from "@/types/database";
import { saveBanner, deleteBanner, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/field";
import { Card, Badge } from "@/components/ui/primitives";
import { ImageUploader } from "./image-uploader";

const initial: AdminState = { ok: false };

const PLACEMENTS: { value: BannerPlacement; label: string; hint: string }[] = [
  { value: "hero", label: "Hero slide", hint: "Full-width carousel at the top" },
  { value: "promo_strip", label: "Promo strip", hint: "Thin bar under the hero" },
  { value: "offer_card", label: "Offer card", hint: "Three-up cards mid-page" },
  { value: "category_tile", label: "Category tile", hint: "Category grid tile" },
];

export function BannerManager({ banners }: { banners: Banner[] }) {
  const [editing, setEditing] = useState<Banner | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove(b: Banner) {
    if (!window.confirm(`Delete the banner “${b.title}”?`)) return;
    start(async () => {
      const result = await deleteBanner(b.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete.");
        return;
      }
      toast.success("Banner deleted.");
      router.refresh();
    });
  }

  const showForm = adding || editing !== null;

  return (
    <>
      {showForm ? (
        <BannerForm
          // Remount per banner: the fields (and the picture) are uncontrolled
          // defaults, so without a key, choosing another banner while the form
          // is open kept showing the first one's values.
          key={editing?.id ?? "new"}
          banner={editing}
          onDone={() => {
            setAdding(false);
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      ) : (
        <Button onClick={() => setAdding(true)} className="mb-4">
          <Plus />
          New banner
        </Button>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {banners.map((b) => (
          <Card key={b.id} className="overflow-hidden">
            {b.image_url ? (
              <div className="relative h-28 bg-surface-sunken">
                <Image
                  src={b.image_url}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="h-3"
                style={{ background: b.accent_hex ?? "#016952" }}
              />
            )}

            <div className="p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="brand">{b.placement.replace(/_/g, " ")}</Badge>
                <Badge tone={b.is_active ? "success" : "neutral"}>
                  {b.is_active ? "Live" : "Hidden"}
                </Badge>
                <span className="text-[11px] text-ink-faint tabular">
                  priority {b.priority}
                </span>
              </div>

              <h3 className="mt-2 text-sm font-semibold text-ink">{b.title}</h3>
              {b.subtitle ? (
                <p className="clamp-2 mt-0.5 text-xs text-ink-muted">{b.subtitle}</p>
              ) : null}
              {b.cta_href ? (
                <p className="mt-1 text-[11px] text-brand-600">
                  {b.cta_label} → {b.cta_href}
                </p>
              ) : null}

              <div className="mt-3 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(b);
                    setAdding(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil size={14} />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => remove(b)}
                  className="text-ink-muted hover:text-danger"
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function BannerForm({
  banner,
  onDone,
  onCancel,
}: {
  banner: Banner | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(saveBanner, initial);

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink">
        {banner ? "Edit banner" : "New banner"}
      </h2>

      <form action={action} className="mt-4 space-y-4">
        {banner ? <input type="hidden" name="id" value={banner.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Placement" htmlFor="placement" required>
            <Select
              id="placement"
              name="placement"
              defaultValue={banner?.placement ?? "hero"}
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} — {p.hint}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority" htmlFor="priority" hint="Higher shows first">
            <Input
              id="priority"
              name="priority"
              type="number"
              defaultValue={banner?.priority ?? 0}
            />
          </Field>

          <Field label="Eyebrow" htmlFor="eyebrow" hint="Small label above the title">
            <Input id="eyebrow" name="eyebrow" defaultValue={banner?.eyebrow ?? ""} />
          </Field>

          <Field
            label="Accent colour"
            htmlFor="accent_hex"
            hint="Hex, e.g. #016952 — tints the hero gradient"
          >
            <Input
              id="accent_hex"
              name="accent_hex"
              defaultValue={banner?.accent_hex ?? ""}
              placeholder="#016952"
            />
          </Field>

          <Field label="Title" htmlFor="title" required className="sm:col-span-2">
            <Input id="title" name="title" required defaultValue={banner?.title ?? ""} />
          </Field>

          <Field label="Subtitle" htmlFor="subtitle" className="sm:col-span-2">
            <Input id="subtitle" name="subtitle" defaultValue={banner?.subtitle ?? ""} />
          </Field>

          {/* One picture, not a desktop/mobile pair: the hero is the same tall
              9:16 card at every screen width, so a second "mobile" picture
              had nowhere to appear — the old field saved a URL nothing read. */}
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-ink">Picture</p>
            <ImageUploader
              name="image_url"
              bucket="banners"
              folder="banners"
              single
              label="picture"
              initial={banner?.image_url ? [banner.image_url] : []}
            />
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Tall (portrait) pictures fit best — hero cards are 9:16. Keep the
              subject in the middle; the edges may be cropped.
            </p>
          </div>

          <Field label="Button label" htmlFor="cta_label">
            <Input id="cta_label" name="cta_label" defaultValue={banner?.cta_label ?? ""} />
          </Field>

          <Field label="Button link" htmlFor="cta_href" hint="e.g. /products?category=projector">
            <Input id="cta_href" name="cta_href" defaultValue={banner?.cta_href ?? ""} />
          </Field>

          <Field label="Second button label" htmlFor="secondary_cta_label">
            <Input
              id="secondary_cta_label"
              name="secondary_cta_label"
              defaultValue={banner?.secondary_cta_label ?? ""}
            />
          </Field>

          <Field label="Second button link" htmlFor="secondary_cta_href">
            <Input
              id="secondary_cta_href"
              name="secondary_cta_href"
              defaultValue={banner?.secondary_cta_href ?? ""}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={banner?.is_active ?? true}
            className="size-4 accent-brand-600"
          />
          Show on the storefront
        </label>

        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" loading={pending}>
            {banner ? "Save changes" : "Create banner"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
