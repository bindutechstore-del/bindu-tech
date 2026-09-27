import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type ProductQuery } from "@/lib/validations/catalog";
import type {
  Brand,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  Review,
} from "@/types/database";

/**
 * Column lists, not `select *`.
 *
 * Migration 0011 revokes the table-wide SELECT grant on `products` and re-issues
 * it as an explicit column list that omits `cost_paisa`. A `select *` therefore
 * FAILS for anon and authenticated — this is deliberate, and it is why every
 * query below names its columns.
 */
export const PRODUCT_CARD_COLUMNS =
  "id, name, slug, sku, price_paisa, compare_at_paisa, stock, thumbnail_url, " +
  "status, is_featured, is_new_arrival, is_best_seller, rating_sum, rating_count, " +
  "units_sold, published_at, category_id, brand_id, short_description, low_stock_threshold, " +
  "points_per_purchase";

const PRODUCT_DETAIL_COLUMNS =
  PRODUCT_CARD_COLUMNS +
  ", description, specifications, features, warranty, delivery_note, video_url, created_at, updated_at";

export type ProductCard = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "sku"
  | "price_paisa"
  | "compare_at_paisa"
  | "stock"
  | "thumbnail_url"
  | "status"
  | "is_featured"
  | "is_new_arrival"
  | "is_best_seller"
  | "rating_sum"
  | "rating_count"
  | "units_sold"
  | "published_at"
  | "category_id"
  | "brand_id"
  | "short_description"
  | "low_stock_threshold"
  | "points_per_purchase"
>;

/** Average rating from the maintained rollup, or null when unrated. */
export function averageRating(p: {
  rating_sum: number;
  rating_count: number;
}): number | null {
  if (!p.rating_count) return null;
  return Math.round((p.rating_sum / p.rating_count) * 10) / 10;
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true });
  return (data as Category[]) ?? [];
});

export const getBrands = cache(async (): Promise<Brand[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data as Brand[]) ?? [];
});

export interface ProductListResult {
  products: ProductCard[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * The storefront listing.
 *
 * Every filter maps onto one of the eight partial indexes declared in
 * migration 0003. Adding a filter that cannot use one of them means a
 * sequential scan on the free tier — check PROJECT_GRAPH.md before you do.
 */
export async function listProducts(
  query: ProductQuery,
): Promise<ProductListResult> {
  const supabase = await createClient();
  const page = query.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;

  let q = supabase
    .from("products")
    .select(PRODUCT_CARD_COLUMNS, { count: "exact" })
    .eq("status", "active");

  if (query.q) {
    // websearch_to_tsquery handles quoted phrases and OR without throwing on
    // punctuation the way plainto_ would.
    q = q.textSearch("search_vector", query.q, {
      type: "websearch",
      config: "simple",
    });
  }

  if (query.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", query.category)
      .maybeSingle();
    // A main category shows its sub-categories' products too: "Headphone &
    // Earphone" must include what is filed under "Earbud Headphones".
    const { data: subs } = cat
      ? await supabase.from("categories").select("id").eq("parent_id", cat.id).eq("is_active", true)
      : { data: [] };
    // An unknown slug must return nothing, not everything.
    q = q.in("category_id", [
      cat?.id ?? "00000000-0000-0000-0000-000000000000",
      ...((subs ?? []) as { id: string }[]).map((s) => s.id),
    ]);
  }

  if (query.brand) {
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", query.brand)
      .maybeSingle();
    q = q.eq("brand_id", brand?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  if (query.min != null) q = q.gte("price_paisa", query.min * 100);
  if (query.max != null) q = q.lte("price_paisa", query.max * 100);
  if (query.in_stock === "1") q = q.gt("stock", 0);
  // A non-null compare-at price IS a markdown: migration 0003 constrains it to
  // `compare_at_paisa is null or compare_at_paisa > price_paisa`, so there is
  // nothing to re-check in memory and `count` stays exact.
  if (query.on_sale === "1") q = q.not("compare_at_paisa", "is", null);
  if (query.new === "1") q = q.eq("is_new_arrival", true);

  switch (query.sort) {
    case "price_asc":
      q = q.order("price_paisa", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price_paisa", { ascending: false });
      break;
    case "popular":
      q = q.order("units_sold", { ascending: false });
      break;
    case "rating":
      // rating_sum, not the average: sorting by a computed ratio cannot use an
      // index, and sum is a good enough proxy for "well reviewed".
      q = q.order("rating_sum", { ascending: false });
      break;
    case "relevance":
    case "newest":
    default:
      q = q
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
  }
  // A unique last sort key. Pages are cut by offset, and without one, rows
  // that tie on the sort (most products share one publish time from the
  // catalogue import; many have the same price or 0 sold) come back in any
  // order — so page 2 / "load more" could repeat some and skip others.
  q = q.order("id");

  const { data, count } = await q.range(from, from + PAGE_SIZE - 1);

  let products = (data as unknown as ProductCard[] | null) ?? [];
  // Rating is a derived value, so the DB cannot index it — filter in memory,
  // and only when the customer asked for it.
  if (query.rating) {
    products = products.filter((p) => (averageRating(p) ?? 0) >= query.rating!);
  }

  const total = count ?? products.length;
  return {
    products,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
  category: Pick<Category, "id" | "name" | "slug"> | null;
  brand: Pick<Brand, "id" | "name" | "slug"> | null;
}

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const supabase = await createClient();

    const { data: product } = await supabase
      .from("products")
      .select(PRODUCT_DETAIL_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    if (!product) return null;
    const p = product as unknown as Product;

    const [images, variants, category, brand] = await Promise.all([
      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", p.id)
        .order("position"),
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", p.id)
        .eq("is_active", true)
        .order("position"),
      p.category_id
        ? supabase
            .from("categories")
            .select("id, name, slug")
            .eq("id", p.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      p.brand_id
        ? supabase
            .from("brands")
            .select("id, name, slug")
            .eq("id", p.brand_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      ...p,
      images: (images.data as ProductImage[]) ?? [],
      variants: (variants.data as ProductVariant[]) ?? [],
      category: (category.data as ProductDetail["category"]) ?? null,
      brand: (brand.data as ProductDetail["brand"]) ?? null,
    };
  },
);

/** Same category, cheapest-first neighbours. Excludes the product itself. */
export async function getRelatedProducts(
  product: Pick<Product, "id" | "category_id">,
  limit = 8,
): Promise<ProductCard[]> {
  if (!product.category_id) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_CARD_COLUMNS)
    .eq("status", "active")
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .order("units_sold", { ascending: false })
    .limit(limit);
  return (data as unknown as ProductCard[]) ?? [];
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Review[]) ?? [];
}

/** Header search suggestions. Deliberately tiny — it runs on every keystroke. */
export async function searchSuggestions(term: string): Promise<ProductCard[]> {
  if (term.trim().length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_CARD_COLUMNS)
    .eq("status", "active")
    .textSearch("search_vector", term, { type: "websearch", config: "simple" })
    .limit(6);
  return (data as unknown as ProductCard[]) ?? [];
}
