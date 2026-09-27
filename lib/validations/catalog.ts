import { z } from "zod";

/** Storefront listing query string → a validated, bounded filter object. */

export const PRODUCT_SORTS = [
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "rating",
  "popular",
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const PAGE_SIZE = 24;

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(80).optional(),
  /** Taka in the URL (human-readable), paisa internally. */
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  sort: z.enum(PRODUCT_SORTS).optional().default("newest"),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  in_stock: z.enum(["1", "0"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  /** Only products marked down below their compare-at price. */
  on_sale: z.enum(["1"]).optional(),
  /** Only products the admin ticked "New arrival". */
  new: z.enum(["1"]).optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

/**
 * Parse whatever is in the URL, discarding anything invalid rather than
 * throwing — a bad `?sort=lol` should render the default listing, not a 500.
 */
export function parseProductQuery(
  params: Record<string, string | string[] | undefined>,
): ProductQuery {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value != null && value !== "") flat[k] = value;
  }
  const parsed = productQuerySchema.safeParse(flat);
  return parsed.success
    ? parsed.data
    : { sort: "newest", page: 1 };
}

export const reviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(10, "Tell other shoppers a little more — at least 10 characters")
    .max(2000),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(160),
  source: z.string().trim().max(40).optional(),
});
