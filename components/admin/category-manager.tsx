"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Category } from "@/types/database";
import { saveCategory, deleteCategory, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/field";
import { Card, Badge } from "@/components/ui/primitives";
import { ImageUploader } from "./image-uploader";

const initial: AdminState = { ok: false };

export function CategoryManager({
  categories,
  productCount,
}: {
  categories: Category[];
  productCount: Record<string, number>;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove(c: Category) {
    if (!window.confirm(`Delete “${c.name}”? This cannot be undone.`)) return;
    start(async () => {
      const result = await deleteCategory(c.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete.");
        return;
      }
      toast.success(result.message ?? "Deleted.");
      router.refresh();
    });
  }

  const showForm = adding || editing !== null;

  // Main categories in position order, each followed by its sub-categories,
  // so the table reads as the hierarchy the storefront shows.
  const mains = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const ordered = [
    ...mains.flatMap((m) => [m, ...childrenOf(m.id)]),
    // A sub-category whose parent is somehow missing still gets listed.
    ...categories.filter((c) => c.parent_id && !mains.some((m) => m.id === c.parent_id)),
  ];

  return (
    <>
      {showForm ? (
        <CategoryForm
          // Remount per category so the defaults (and the picture) reset.
          key={editing?.id ?? "new"}
          category={editing}
          mains={mains}
          hasChildren={editing ? childrenOf(editing.id).length > 0 : false}
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
          New category
        </Button>
      )}

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Slug</th>
              <th className="px-3 py-3 font-medium">Icon</th>
              <th className="px-3 py-3 text-right font-medium">Products</th>
              <th className="px-3 py-3 text-right font-medium">Position</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ordered.map((c) => (
              <tr key={c.id} className="hover:bg-surface-sunken">
                <td className="px-4 py-3 font-medium text-ink">
                  {c.parent_id ? (
                    <span className="flex items-center gap-1.5 pl-5 font-normal text-ink-soft">
                      <span className="text-ink-faint" aria-hidden>
                        ↳
                      </span>
                      {c.name}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {c.name}
                      {childrenOf(c.id).length > 0 ? (
                        <span className="rounded-full bg-surface-sunken px-1.5 text-[11px] font-normal text-ink-muted">
                          {childrenOf(c.id).length} sub
                        </span>
                      ) : null}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-ink-muted tabular">{c.slug}</td>
                <td className="px-3 py-3 text-xs text-ink-muted">{c.icon ?? "—"}</td>
                <td className="px-3 py-3 text-right tabular text-ink-muted">
                  {productCount[c.id] ?? 0}
                </td>
                <td className="px-3 py-3 text-right tabular text-ink-muted">
                  {c.position}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={c.is_active ? "success" : "neutral"}>
                    {c.is_active ? "Active" : "Hidden"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditing(c);
                        setAdding(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink"
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(c)}
                      disabled={pending}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function CategoryForm({
  category,
  mains,
  hasChildren,
  onDone,
  onCancel,
}: {
  category: Category | null;
  /** Main categories, the only valid parents. */
  mains: Category[];
  /** A category holding sub-categories must stay a main category. */
  hasChildren: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(saveCategory, initial);

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
        {category ? `Edit ${category.name}` : "New category"}
      </h2>

      <form action={action} className="mt-4 space-y-4">
        {category ? <input type="hidden" name="id" value={category.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required error={state.fieldErrors?.name}>
            <Input id="name" name="name" required defaultValue={category?.name ?? ""} />
          </Field>

          <Field label="Slug" htmlFor="slug" hint="Blank generates from the name">
            <Input id="slug" name="slug" defaultValue={category?.slug ?? ""} />
          </Field>

          <Field
            label="Parent category"
            htmlFor="parent_id"
            hint={
              hasChildren
                ? "It has sub-categories of its own, so it stays a main category"
                : "Leave as “None” for a main category"
            }
          >
            <Select
              id="parent_id"
              name="parent_id"
              defaultValue={category?.parent_id ?? ""}
              disabled={hasChildren}
            >
              <option value="">None — main category</option>
              {mains
                .filter((m) => m.id !== category?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </Select>
          </Field>

          <Field
            label="Lucide icon name"
            htmlFor="icon"
            hint="e.g. Headphones, BatteryCharging, Gamepad2"
          >
            <Input id="icon" name="icon" defaultValue={category?.icon ?? ""} />
          </Field>

          <Field label="Position" htmlFor="position" hint="Lower shows first">
            <Input
              id="position"
              name="position"
              type="number"
              min="0"
              defaultValue={category?.position ?? 0}
            />
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-ink">Picture</p>
            <ImageUploader
              name="image_url"
              bucket="category-images"
              folder="categories"
              single
              label="picture"
              // category-images is capped at 2 MB (migration 0012), and a
              // category tile is never shown large.
              maxBytes={2 * 1024 * 1024}
              maxEdge={1000}
              initial={category?.image_url ? [category.image_url] : []}
            />
          </div>

          <Field label="Description" htmlFor="description" className="sm:col-span-2">
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={category?.description ?? ""}
            />
          </Field>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={category?.is_active ?? true}
              className="size-4 accent-brand-600"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={category?.is_featured ?? true}
              className="size-4 accent-brand-600"
            />
            Show on homepage
          </label>
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" loading={pending}>
            {category ? "Save changes" : "Create category"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
