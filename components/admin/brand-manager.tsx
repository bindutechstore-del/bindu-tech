"use client";

import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { saveBrand, deleteBrand, type AdminState } from "@/lib/actions/admin";
import { ImageUploader } from "./image-uploader";
import { Button } from "@/components/ui/button";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Input, Textarea, Field } from "@/components/ui/field";

const initial: AdminState = { ok: false };

export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  productCount: number;
}

export function BrandManager({ brands }: { brands: BrandRow[] }) {
  // null = closed, "new" = creating, a row = editing that row.
  const [editing, setEditing] = useState<BrandRow | "new" | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [removing, startRemove] = useTransition();
  const [query, setQuery] = useState("");

  const shown = brands.filter((b) =>
    b.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a brand…"
            className="h-9 min-w-40 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
          />
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={15} />
            New brand
          </Button>
        </div>

        {notice ? (
          <p
            role={notice.ok ? "status" : "alert"}
            className={`mx-3 mt-3 rounded-lg px-3 py-2 text-sm ${
              notice.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            }`}
          >
            {notice.text}
          </p>
        ) : null}

        {shown.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Tag size={28} />}
              title={brands.length === 0 ? "No brands yet" : "No brand matches that"}
              description="Brands appear on products and in the storefront filter."
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-sunken">
                  {b.logo_url ? (
                    <Image src={b.logo_url} alt="" fill sizes="40px" className="object-contain p-1" unoptimized />
                  ) : (
                    <span className="text-sm font-bold text-ink-muted">
                      {b.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <span className="truncate">{b.name}</span>
                    {!b.is_active ? <Badge tone="neutral">Hidden</Badge> : null}
                    {!b.logo_url ? <Badge tone="warning">No logo</Badge> : null}
                  </p>
                  <p className="text-xs text-ink-muted">
                    /{b.slug} · {b.productCount}{" "}
                    {b.productCount === 1 ? "product" : "products"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(b)}
                  className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                  aria-label={`Edit ${b.name}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => {
                    if (!confirm(`Delete the brand “${b.name}”?`)) return;
                    startRemove(async () => {
                      const r = await deleteBrand(b.id);
                      setNotice({ ok: r.ok, text: r.ok ? (r.message ?? "Deleted.") : (r.error ?? "Could not delete.") });
                    });
                  }}
                  className="rounded-md p-2 text-ink-muted hover:bg-danger-soft hover:text-danger"
                  aria-label={`Delete ${b.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing ? (
        <BrandForm
          // Remount per brand so the form's default values reset.
          key={editing === "new" ? "new" : editing.id}
          brand={editing === "new" ? null : editing}
          onDone={(text) => {
            setEditing(null);
            setNotice({ ok: true, text });
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Card className="h-fit p-5 text-sm text-ink-muted">
          Choose a brand to rename it, change its logo or hide it — or add a new
          one. A hidden brand stays on its products but leaves the storefront
          filter.
        </Card>
      )}
    </div>
  );
}

function BrandForm({
  brand,
  onDone,
  onCancel,
}: {
  brand: BrandRow | null;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(saveBrand, initial);

  useEffect(() => {
    if (state.ok) onDone(state.message ?? "Saved.");
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="h-fit p-5">
      <h2 className="text-sm font-semibold text-ink">
        {brand ? `Edit ${brand.name}` : "New brand"}
      </h2>

      <form
        action={action}
        // As in the product form: without this, React 19's post-action reset
        // put the OLD name back after "A brand called … already exists", so the
        // message appeared to be about the name that was not the problem.
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="mt-4 space-y-4"
      >
        {brand ? <input type="hidden" name="id" value={brand.id} /> : null}

        <Field label="Name" htmlFor="brand-name" required error={state.fieldErrors?.name}>
          <Input id="brand-name" name="name" required defaultValue={brand?.name ?? ""} />
        </Field>

        <Field
          label="Slug"
          htmlFor="brand-slug"
          hint="Leave empty to make one from the name"
          error={state.fieldErrors?.slug}
        >
          <Input
            id="brand-slug"
            name="slug"
            defaultValue={brand?.slug ?? ""}
            placeholder="e.g. anker"
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">
            Logo {brand ? null : <span className="text-danger">*</span>}
          </p>
          <p className="mb-2 text-[11px] text-ink-faint">
            Shown in the homepage “Our Brands” row and on the Brands page. A wide
            logo on a plain background looks best.
          </p>
          <ImageUploader
            name="logo_url"
            folder="brands"
            single
            label="logo"
            initial={brand?.logo_url ? [brand.logo_url] : []}
          />
        </div>

        <Field
          label="About the brand"
          htmlFor="brand-description"
          hint="Shown on the brand's page above its products. A few lines is plenty."
          error={state.fieldErrors?.description}
        >
          <Textarea
            id="brand-description"
            name="description"
            rows={4}
            maxLength={2000}
            defaultValue={brand?.description ?? ""}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={brand ? brand.is_active : true}
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
            {brand ? "Save changes" : "Create brand"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
