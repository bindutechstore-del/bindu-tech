import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_PAGES } from "@/lib/content/pages";

/**
 * Sitemap.
 *
 * Bounded deliberately: 1,000 products is plenty for a catalog this size, and
 * an unbounded scan of the products table on every crawler hit is exactly the
 * kind of query the free tier cannot absorb.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("slug, updated_at")
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(1000),
    supabase.from("categories").select("slug, updated_at").eq("is_active", true),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/track`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/be-partner`, changeFrequency: "monthly", priority: 0.4 },
    ...CONTENT_PAGES.map((p) => ({
      url: `${base}/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];

  const categoryRoutes: MetadataRoute.Sitemap = (
    (categories ?? []) as { slug: string; updated_at: string }[]
  ).map((c) => ({
    url: `${base}/products?category=${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = (
    (products ?? []) as { slug: string; updated_at: string }[]
  ).map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
