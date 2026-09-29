"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/field";
import type { ProductSort } from "@/lib/validations/catalog";

const OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "popular", label: "Most popular" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

export function SortSelect({ value, className }: { value: ProductSort; className?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      <span className="hidden sm:inline">Sort</span>
      <Select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("sort", e.target.value);
          next.delete("page");
          startTransition(() => {
            router.push(`${pathname}?${next.toString()}`);
          });
        }}
        className={className ?? "h-9 w-44 text-sm"}
        aria-label="Sort products"
        disabled={isPending}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
