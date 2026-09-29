"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface BrandTile {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

/** A brand's logo, or its name when no logo has been uploaded yet. */
export function BrandLogo({ brand, sizes }: { brand: BrandTile; sizes: string }) {
  return brand.logo_url ? (
    <Image src={brand.logo_url} alt={brand.name} fill sizes={sizes} className="object-contain p-4" />
  ) : (
    <span className="px-3 text-center text-lg font-bold tracking-tight text-ink-soft">
      {brand.name}
    </span>
  );
}

/**
 * "Our Brands": logos in a row that swipes, two to a view on a phone, with
 * page dots under it. The dots follow the scroll and jump to a page on tap.
 */
export function BrandCarousel({ brands }: { brands: BrandTile[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  // One "page" is one view of tiles: the rail's width minus its side padding,
  // plus the gap after the last tile — not clientWidth, which includes the
  // padding and made every dot overshoot. The last dot means "scrolled to the
  // end", however short that last page is.
  const metrics = (rail: HTMLDivElement) => {
    const cs = getComputedStyle(rail);
    const step =
      rail.clientWidth -
      parseFloat(cs.paddingLeft) -
      parseFloat(cs.paddingRight) +
      parseFloat(cs.columnGap || "0");
    const maxLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    return { step: Math.max(1, step), maxLeft };
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => {
      const { step, maxLeft } = metrics(rail);
      const total = maxLeft <= 1 ? 1 : Math.ceil(maxLeft / step - 0.01) + 1;
      setPages(total);
      setPage(
        rail.scrollLeft >= maxLeft - 1 ? total - 1 : Math.round(rail.scrollLeft / step),
      );
    };
    measure();
    rail.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    return () => {
      rail.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, []);

  const goTo = (i: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const { step, maxLeft } = metrics(rail);
    rail.scrollTo({ left: Math.min(i * step, maxLeft), behavior: "smooth" });
  };

  return (
    <div>
      <div ref={railRef} className="rail -mx-4 flex scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/products?brand=${b.slug}`}
            className="relative flex aspect-[3/2] w-[calc(50%-0.375rem)] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-lift sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(16.666%-0.625rem)]"
            aria-label={`${b.name} products`}
          >
            <BrandLogo brand={b} sizes="(min-width: 1024px) 200px, 50vw" />
          </Link>
        ))}
      </div>

      {pages > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={`size-2 rounded-full border border-brand-600 transition-colors ${
                i === page ? "bg-brand-600" : "bg-transparent"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
