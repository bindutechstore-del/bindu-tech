import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_CARD_COLUMNS, type ProductCard } from "./catalog";
import type { Banner, Category, FlashSale, FlashSaleItem } from "@/types/database";

/**
 * Homepage data, split by section rather than fetched as one block.
 *
 * The homepage used to load banners, categories, three product rails, the
 * flash sale and the review wall before it could render a single pixel. Every
 * one of those queries sat on the critical path, so the visitor waited for the
 * slowest of them to see the hero.
 *
 * Each section now fetches its own data and the page renders them inside
 * separate Suspense boundaries, so the hero streams immediately and the rest
 * arrives as it resolves. Same total work, a fraction of the time to first
 * paint, and no extra memory — the rows are streamed out rather than all held
 * at once.
 *
 * Every function is wrapped in React `cache`, so a section appearing twice in
 * one render still costs one round trip.
 */

export interface LiveFlashSale extends FlashSale {
  items: (FlashSaleItem & { product: ProductCard | null })[];
}

/** Banners for the hero rail. One query serves every placement. */
export const getBanners = cache(async () => {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  const all = (data as unknown as Banner[]) ?? [];
  // The RLS policy filters the schedule window too, but banners are cached
  // across requests, so re-check it here.
  const live = all.filter(
    (b) =>
      (!b.starts_at || b.starts_at <= nowIso) &&
      (!b.ends_at || b.ends_at >= nowIso),
  );

  return {
    hero: live.filter((b) => b.placement === "hero"),
    categoryTiles: live.filter((b) => b.placement === "category_tile"),
    promoStrip: live.find((b) => b.placement === "promo_strip") ?? null,
    offerCards: live.filter((b) => b.placement === "offer_card"),
  };
});

/**
 * Categories for the homepage grid — the featured ones, capped.
 *
 * The full taxonomy is 37 deep, and rendering all of it here produced a
 * 1300px wall of tiles that pushed the flash sale and every product rail
 * below the fold. The drawer and /products still list everything; the
 * homepage shows the ones an admin marked featured and stops at twelve.
 */
export const getTopCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("is_featured", { ascending: false })
    .order("position")
    .limit(12);
  return (data as unknown as Category[]) ?? [];
});

/**
 * The three homepage rails, each following the tick the admin sets on the
 * product ("New arrival", "Featured", "Best seller").
 *
 * This used to be one query for the 40 most recently published products,
 * sliced in memory. That ignored the ticks entirely: "New arrivals" was just
 * the 12 newest — and since the catalogue import gave most products the same
 * publish time, effectively an arbitrary 12 in no guaranteed order, while a
 * product ticked "New arrival" could be missing. Best sellers and Featured
 * could only ever come from that window of 40.
 *
 * Three small queries in parallel, each served by an existing partial index
 * (products_active_published_idx, products_featured_idx,
 * products_best_sellers_idx), each with a unique tie-breaker so the order is
 * stable. When the admin has ticked nothing for a rail, it falls back to the
 * newest / most-sold products so a new shop's homepage is not empty.
 */
export const getRailProducts = cache(async () => {
  const supabase = await createClient();
  const base = () =>
    supabase.from("products").select(PRODUCT_CARD_COLUMNS).eq("status", "active");

  const [newRes, featuredRes, bestRes] = await Promise.all([
    base()
      .eq("is_new_arrival", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id")
      .limit(12),
    base()
      .eq("is_featured", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id")
      .limit(8),
    base()
      .eq("is_best_seller", true)
      .order("units_sold", { ascending: false })
      .order("id")
      .limit(8),
  ]);

  let newArrivals = (newRes.data as unknown as ProductCard[]) ?? [];
  const featured = (featuredRes.data as unknown as ProductCard[]) ?? [];
  let bestSellers = (bestRes.data as unknown as ProductCard[]) ?? [];
  const newArrivalsTicked = newArrivals.length > 0;

  // Fallbacks, only when nothing is ticked for that rail.
  const [fallbackNew, fallbackBest] = await Promise.all([
    newArrivalsTicked
      ? null
      : base()
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .order("id")
          .limit(12),
    bestSellers.length > 0
      ? null
      : base().gt("units_sold", 0).order("units_sold", { ascending: false }).order("id").limit(8),
  ]);
  if (fallbackNew) newArrivals = (fallbackNew.data as unknown as ProductCard[]) ?? [];
  if (fallbackBest) bestSellers = (fallbackBest.data as unknown as ProductCard[]) ?? [];

  return {
    newArrivals,
    /** True when the rail shows ticked products (so "See all" can filter). */
    newArrivalsTicked,
    featured,
    bestSellers,
    hasAny: newArrivals.length > 0 || featured.length > 0 || bestSellers.length > 0,
  };
});

/** The live flash sale, or null. Two queries, and only when a sale exists. */
export const getFlashSale = cache(async (): Promise<LiveFlashSale | null> => {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: sales } = await supabase
    .from("flash_sales")
    .select("*")
    .eq("is_active", true)
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("ends_at", { ascending: true })
    .limit(1);

  const sale = (sales as unknown as FlashSale[] | null)?.[0];
  if (!sale) return null;

  const { data: items } = await supabase
    .from("flash_sale_items")
    .select("*")
    .eq("flash_sale_id", sale.id)
    .order("position");

  const saleItems = (items as unknown as FlashSaleItem[]) ?? [];
  if (saleItems.length === 0) return null;

  const { data: products } = await supabase
    .from("products")
    .select(PRODUCT_CARD_COLUMNS)
    .in("id", saleItems.map((i) => i.product_id))
    .eq("status", "active");

  const byId = new Map(
    ((products as unknown as ProductCard[]) ?? []).map((p) => [p.id, p]),
  );

  return {
    ...sale,
    items: saleItems
      .map((i) => ({ ...i, product: byId.get(i.product_id) ?? null }))
      .filter((i) => i.product !== null),
  };
});

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

/** Approved 4-star-plus reviews for the social-proof rail. */
export const getHomeReviews = cache(async (): Promise<HomeReview[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, title, body, created_at, product_id, user_id")
    .eq("status", "approved")
    .gte("rating", 4)
    .order("created_at", { ascending: false })
    .limit(10);

  const rows = (data ?? []) as {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    created_at: string;
    product_id: string;
    user_id: string;
  }[];
  if (rows.length === 0) return [];

  const [{ data: products }, { data: profiles }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug")
      .in("id", rows.map((r) => r.product_id)),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", rows.map((r) => r.user_id)),
  ]);

  const productById = new Map(
    ((products ?? []) as { id: string; name: string; slug: string }[]).map((p) => [
      p.id,
      p,
    ]),
  );
  const nameById = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null }[]).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

  return rows.map((r) => {
    const product = productById.get(r.product_id);
    const full = nameById.get(r.user_id) ?? "Verified buyer";
    // Surname initial only — a review wall is not a place to publish full names.
    const [first, ...rest] = String(full).split(" ");
    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      created_at: r.created_at,
      author: rest.length ? `${first} ${rest.at(-1)![0]}.` : first!,
      product_name: product?.name ?? null,
      product_slug: product?.slug ?? null,
    };
  });
});
