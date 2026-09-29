"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { BrandLogo, type BrandTile } from "./brand-carousel";

/** The Brands page: every brand as its logo, with a search box on top. */
export function BrandDirectory({ brands }: { brands: BrandTile[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = term ? brands.filter((b) => b.name.toLowerCase().includes(term)) : brands;

  if (brands.length === 0) {
    return <p className="text-sm text-ink-muted">No brands yet — check back soon.</p>;
  }

  return (
    <div>
      <div className="relative mb-5 max-w-md">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search brands…"
          aria-label="Search brands"
          className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-ink-muted">No brand matches “{q.trim()}”.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shown.map((b) => (
            <li key={b.id}>
              <Link
                href={`/brands/${b.slug}`}
                className="group block overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-lift"
              >
                <span className="relative flex aspect-[3/2] items-center justify-center">
                  <BrandLogo brand={b} sizes="(min-width: 1024px) 220px, 45vw" />
                </span>
                <span className="block border-t border-line px-3 py-2 text-center text-xs font-medium text-ink-soft group-hover:text-brand-700">
                  {b.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
