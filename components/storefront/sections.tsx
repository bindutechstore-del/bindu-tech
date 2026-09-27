import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  BadgeCheck,
  Headphones,
  Wallet,
  RotateCcw,
  Gift,
  Clock,
  Star,
  Store,
  type LucideIcon,
} from "lucide-react";
import * as Icons from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Rating } from "@/components/ui/primitives";
import type { ProductCard as ProductCardData } from "@/lib/queries/catalog";
import type { Banner, Category } from "@/types/database";
import type { HighlightIcon, HomeHighlight } from "@/lib/content/highlights";

/** Section shell: heading, optional "see all", and the content. */
export function Section({
  title,
  subtitle,
  href,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-7xl px-4 py-10 ${className ?? ""}`}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="group flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            See all
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: ProductCardData[];
  priorityCount?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

/** Horizontal rail for rows that should not push the fold down on mobile. */
export function ProductRail({ products }: { products: ProductCardData[] }) {
  return (
    <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} className="w-44 shrink-0 sm:w-52" />
      ))}
    </div>
  );
}

/**
 * Category tiles. `icon` is a Lucide name stored on the row, so an admin can
 * change the icon without a deploy. Unknown names fall back rather than crash.
 */
export function CategoryGrid({
  categories,
  oneRow = false,
}: {
  categories: Category[];
  /**
   * Homepage: exactly one row at every screen size — four tiles on phones and
   * tablets, six on a computer — with "See all" for the rest. Twelve tiles
   * used to fill two rows on a computer and four on a phone before the first
   * product.
   */
  oneRow?: boolean;
}) {
  const shown = oneRow ? categories.slice(0, 6) : categories;
  return (
    <div
      className={`grid sm:grid-cols-4 sm:gap-3 lg:grid-cols-6 ${
        oneRow ? "grid-cols-4 gap-2" : "grid-cols-3 gap-3"
      }`}
    >
      {shown.map((c, i) => {
        const Icon =
          (c.icon && (Icons as unknown as Record<string, LucideIcon>)[c.icon]) ||
          Icons.Package;

        return (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}`}
            className={`group flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-4 text-center transition-all hover:border-brand-200 hover:shadow-lift ${
              oneRow ? "max-sm:p-2 max-sm:gap-1.5" : ""
            } ${oneRow && i >= 4 ? "max-lg:hidden" : ""}`}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
              {c.image_url ? (
                <Image
                  src={c.image_url}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <Icon size={22} />
              )}
            </span>
            <span className="text-xs font-medium leading-4 text-ink group-hover:text-brand-700">
              {c.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** Offer cards, from banners with placement='offer_card'. */
export function OfferCards({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {banners.map((b) => (
        <div
          key={b.id}
          className="relative overflow-hidden rounded-xl border border-line bg-surface p-5"
          style={{ borderLeftWidth: 3, borderLeftColor: b.accent_hex ?? "#1b4dff" }}
        >
          {b.eyebrow ? (
            <span
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: b.accent_hex ?? "#1b4dff" }}
            >
              {b.eyebrow}
            </span>
          ) : null}
          <h3 className="mt-1 text-base font-semibold text-ink">{b.title}</h3>
          {b.subtitle ? (
            <p className="mt-1 text-sm leading-5 text-ink-muted">{b.subtitle}</p>
          ) : null}
          {b.cta_href && b.cta_label ? (
            <Link
              href={b.cta_href}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {b.cta_label}
              <ArrowRight size={14} />
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Static value props — deliberately not database-driven, they never change. */
const HIGHLIGHT_ICON: Record<HighlightIcon, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  badge: BadgeCheck,
  headphones: Headphones,
  wallet: Wallet,
  refresh: RotateCcw,
  gift: Gift,
  clock: Clock,
  star: Star,
  store: Store,
};

/** The "Buying from <store>" cards — written in /admin/settings. */
export function WhyChooseUs({ highlights }: { highlights: HomeHighlight[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {highlights.map((p, i) => {
        const Icon = HIGHLIGHT_ICON[p.icon] ?? BadgeCheck;
        return (
          <div key={i} className="rounded-xl border border-line bg-surface p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon size={19} />
            </span>
            {p.title ? <h3 className="mt-3 text-sm font-semibold text-ink">{p.title}</h3> : null}
            {p.body ? <p className="mt-1 text-sm leading-5 text-ink-muted">{p.body}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export interface HomeReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  author: string;
  product_name: string | null;
  product_slug: string | null;
}

export function ReviewWall({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {reviews.map((r) => (
        <figure
          key={r.id}
          className="flex w-72 shrink-0 flex-col rounded-xl border border-line bg-surface p-4"
        >
          <Rating value={r.rating} size={13} />
          {r.title ? (
            <figcaption className="mt-2 text-sm font-semibold text-ink">
              {r.title}
            </figcaption>
          ) : null}
          <blockquote className="clamp-3 mt-1 flex-1 text-sm leading-5 text-ink-muted">
            {r.body}
          </blockquote>
          <div className="mt-3 border-t border-line pt-2.5">
            <p className="text-xs font-medium text-ink">{r.author}</p>
            {r.product_slug && r.product_name ? (
              <Link
                href={`/products/${r.product_slug}`}
                className="clamp-2 text-[11px] text-ink-muted hover:text-brand-700"
              >
                on {r.product_name}
              </Link>
            ) : null}
          </div>
        </figure>
      ))}
    </div>
  );
}
