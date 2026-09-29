"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Check } from "lucide-react";
import type { Brand, Category } from "@/types/database";
import type { ProductQuery } from "@/lib/validations/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Rating } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";

/**
 * Category / brand / price / stock / rating filters.
 *
 * Filters are URL state, not component state: a filtered listing is shareable,
 * bookmarkable and server-rendered. The drawer is the same component on mobile.
 *
 * useTransition wraps every navigation so the filter panel stays interactive
 * while the products grid streams in from the server.
 */
export function FilterPanel({
  categories,
  brands,
  query,
  resultCount,
}: {
  categories: Category[];
  brands: Brand[];
  query: ProductQuery;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page"); // any filter change resets pagination
    // Wrap in startTransition so React keeps the current UI interactive
    // while streaming the new server-rendered page in the background.
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  const activeCount = [
    query.category,
    query.brand,
    query.min != null ? "min" : null,
    query.max != null ? "max" : null,
    query.in_stock,
    query.rating != null ? "rating" : null,
  ].filter(Boolean).length;

  const sortLabel = SORTS.find((s) => s.value === query.sort)?.label ?? "Newest first";

  const body = (
    <div className="space-y-6">
      {/* Sorting lives with the filters — one place to narrow and order the
          list, one button on a phone — with price high/low first. */}
      <FilterGroup title="Sort by">
        <ul className="space-y-1">
          {SORTS.map((s) => (
            <li key={s.value}>
              <FilterLink
                active={query.sort === s.value}
                pending={isPending}
                onClick={() => setParam("sort", s.value === "newest" ? null : s.value)}
              >
                {s.label}
              </FilterLink>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Category">
        <ul className="space-y-1">
          <li>
            <FilterLink
              active={!query.category}
              pending={isPending}
              onClick={() => setParam("category", null)}
            >
              All categories
            </FilterLink>
          </li>
          {categories
            .filter((c) => !c.parent_id)
            .map((c) => (
              <li key={c.id}>
                <FilterLink
                  active={query.category === c.slug}
                  pending={isPending}
                  onClick={() =>
                    setParam("category", query.category === c.slug ? null : c.slug)
                  }
                >
                  {c.name}
                </FilterLink>
              </li>
            ))}
        </ul>
      </FilterGroup>

      {brands.length > 0 ? (
        <FilterGroup title="Brand">
          <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
            <li>
              <FilterLink active={!query.brand} pending={isPending} onClick={() => setParam("brand", null)}>
                All brands
              </FilterLink>
            </li>
            {brands.map((b) => (
              <li key={b.id}>
                <FilterLink
                  active={query.brand === b.slug}
                  pending={isPending}
                  onClick={() => setParam("brand", query.brand === b.slug ? null : b.slug)}
                >
                  {b.name}
                </FilterLink>
              </li>
            ))}
          </ul>
        </FilterGroup>
      ) : null}

      <FilterGroup title="Price (৳)">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const next = new URLSearchParams(params.toString());
            const min = String(form.get("min") ?? "").trim();
            const max = String(form.get("max") ?? "").trim();
            min ? next.set("min", min) : next.delete("min");
            max ? next.set("max", max) : next.delete("max");
            next.delete("page");
            startTransition(() => {
              router.push(`${pathname}?${next.toString()}`);
            });
          }}
        >
          <Input
            name="min"
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={query.min ?? ""}
            className="h-9 text-xs"
            aria-label="Minimum price in taka"
          />
          <span className="text-ink-faint">–</span>
          <Input
            name="max"
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={query.max ?? ""}
            className="h-9 text-xs"
            aria-label="Maximum price in taka"
          />
          <Button type="submit" size="sm" variant="outline">
            Go
          </Button>
        </form>
      </FilterGroup>

      <FilterGroup title="Rating">
        <ul className="space-y-1">
          {[4, 3].map((r) => (
            <li key={r}>
              <FilterLink
                active={query.rating === r}
                pending={isPending}
                onClick={() =>
                  setParam("rating", query.rating === r ? null : String(r))
                }
              >
                <span className="flex items-center gap-1.5">
                  <Rating value={r} size={15} />
                  <span className="text-xs">& up</span>
                </span>
              </FilterLink>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Availability">
        <FilterLink
          active={query.in_stock === "1"}
          pending={isPending}
          onClick={() => setParam("in_stock", query.in_stock === "1" ? null : "1")}
        >
          In stock only
        </FilterLink>
      </FilterGroup>

      {activeCount > 0 ? (
        <Button asChild variant="ghost" size="sm" block>
          <Link href={pathname}>Clear all filters</Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Loading overlay on the product grid — visible instantly on filter click */}
      {isPending ? (
        <div className="fixed inset-x-0 top-0 z-[100] h-[2.5px]">
          <div
            className="h-full bg-brand-600"
            style={{
              animation: "nav-progress 1.8s cubic-bezier(0.4, 0, 0, 1) forwards",
            }}
          />
        </div>
      ) : null}

      {/* Mobile: one Filters button for everything, sorting included. The
          current order is named on it so it is clear without opening. */}
      <div className="lg:hidden">
        <Button variant="outline" onClick={() => setOpen(true)} block className="justify-start">
          <SlidersHorizontal />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white tabular">
              {activeCount}
            </span>
          ) : null}
          <span className="ml-auto truncate text-xs font-normal text-ink-muted">{sortLabel}</span>
        </Button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            tabIndex={-1}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Sort &amp; filter</h2>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-surface-sunken"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            {body}
            <div className="sticky bottom-0 mt-5 bg-surface pt-3">
              <Button block onClick={() => setOpen(false)}>
                Show {resultCount} results
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="hidden lg:block">
        <div className="sticky top-32 rounded-xl border border-line bg-surface p-4">
          {body}
        </div>
      </aside>
    </>
  );
}

const SORTS: { value: ProductQuery["sort"]; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Top rated" },
];

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterLink({
  active,
  pending,
  onClick,
  children,
}: {
  active: boolean;
  pending?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-brand-50 font-medium text-brand-700"
          : "text-ink-soft hover:bg-surface-sunken",
        pending && "pointer-events-none opacity-70",
      )}
    >
      <span>{children}</span>
      {active ? <Check size={14} className="shrink-0" /> : null}
    </button>
  );
}
