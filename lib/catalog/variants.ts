import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { takaToPaisa } from "@/lib/utils/money";

/**
 * Sizes and options for a product (admin → product form → "Sizes & options").
 *
 * Each row is a size and/or a colour with its own stock and, optionally, its
 * own price. The storefront, cart, checkout and orders already understood
 * product_variants; this is the admin side that writes them.
 */

/** One row as the form posts it (prices in taka, as typed). */
export const variantRowSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("")),
    size: z.string().trim().max(40).default(""),
    color: z.string().trim().max(40).default(""),
    stock: z.coerce.number().int("Stock must be a whole number").min(0).max(100000),
    price: z
      .union([z.literal(""), z.coerce.number().positive("A price must be above zero").max(10_000_000)])
      .optional(),
    active: z.boolean().default(true),
  })
  .refine((r) => r.size || r.color, { message: "Give every row a size or a colour" });

export type VariantRow = z.infer<typeof variantRowSchema>;

export const variantRowsSchema = z.array(variantRowSchema).max(60, "At most 60 sizes / options");

/** "M", "Black" or "M / Black". */
export function variantName(size: string, color: string): string {
  return [size.trim(), color.trim()].filter(Boolean).join(" / ");
}

const skuPart = (s: string) =>
  s.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "").toUpperCase().slice(0, 12);

/**
 * SKUs for new rows: PRODUCTSKU-SIZE-COLOUR, unique against `used` (every
 * variant SKU already taken, case-insensitively). Bangla-only names have no
 * Latin letters, so those fall back to a position number.
 */
export function newVariantSku(base: string, size: string, color: string, index: number, used: Set<string>): string {
  const tail = [skuPart(size), skuPart(color)].filter(Boolean).join("-") || `V${index + 1}`;
  const stem = `${base.trim().toUpperCase()}-${tail}`;
  let sku = stem;
  for (let n = 2; used.has(sku); n++) sku = `${stem}-${n}`;
  used.add(sku);
  return sku;
}

/** Parse the form's JSON. Returns rows, or an error sentence for the operator. */
export function parseVariantRows(raw: unknown): { rows: VariantRow[] } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { error: "The sizes could not be read. Please try again." };
  }
  const parsed = variantRowsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the sizes." };

  const seen = new Set<string>();
  for (const r of parsed.data) {
    const key = variantName(r.size, r.color).toLowerCase();
    if (seen.has(key)) return { error: `"${variantName(r.size, r.color)}" is listed twice.` };
    seen.add(key);
  }
  return { rows: parsed.data };
}

/**
 * Make the product's variants match the form: update rows that exist, add
 * new ones, delete removed ones (past orders keep their own copy of the size
 * name; carts holding a removed size simply lose that line).
 *
 * products.stock and products.has_variants follow from the stock-sync
 * trigger (0034). When every row is removed the product goes back to its own
 * stock figure, `fallbackStock`, from the form.
 *
 * Returns null, or what went wrong.
 */
export async function syncProductVariants(
  db: SupabaseClient,
  productId: string,
  productSku: string,
  rows: VariantRow[],
  fallbackStock: number,
): Promise<string | null> {
  const { data: existing, error: readError } = await db
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);
  if (readError) return readError.message;

  const existingIds = new Set(((existing ?? []) as { id: string }[]).map((e) => e.id));
  const hadAny = existingIds.size > 0;
  const keptIds = new Set(rows.map((r) => r.id).filter((id): id is string => Boolean(id && existingIds.has(id))));

  const removed = [...existingIds].filter((id) => !keptIds.has(id));
  if (removed.length) {
    const { error } = await db.from("product_variants").delete().in("id", removed);
    if (error) return error.message;
  }

  const fields = (r: VariantRow, position: number) => ({
    name: variantName(r.size, r.color),
    attributes: {
      ...(r.size ? { size: r.size } : {}),
      ...(r.color ? { color: r.color } : {}),
    },
    stock: r.stock,
    price_paisa: r.price === "" || r.price === undefined ? null : takaToPaisa(r.price),
    is_active: r.active,
    position,
  });

  for (const [i, r] of rows.entries()) {
    if (r.id && keptIds.has(r.id)) {
      const { error } = await db.from("product_variants").update(fields(r, i)).eq("id", r.id);
      if (error) return error.message;
    }
  }

  const fresh = rows.map((r, i) => ({ r, i })).filter(({ r }) => !(r.id && keptIds.has(r.id)));
  if (fresh.length) {
    // Every variant SKU already taken with this stem, so new ones can avoid them.
    const stem = productSku.trim().toUpperCase().replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: taken } = await db.from("product_variants").select("sku").ilike("sku", `${stem}-%`);
    const used = new Set(((taken ?? []) as { sku: string }[]).map((t) => t.sku.toUpperCase()));
    const { error } = await db.from("product_variants").insert(
      fresh.map(({ r, i }) => ({
        product_id: productId,
        sku: newVariantSku(productSku, r.size, r.color, i, used),
        ...fields(r, i),
      })),
    );
    if (error) return error.code === "23505" ? "Two sizes ended up with the same SKU — please save again." : error.message;
  }

  // A product that just gained sizes: any cart line added before, with no
  // size, could only become an order nobody can pack.
  if (!hadAny && rows.length > 0) {
    await db.from("cart_items").delete().eq("product_id", productId).is("variant_id", null);
  }

  // Back to a single stock figure when the last size is removed.
  if (hadAny && rows.length === 0) {
    const { error } = await db
      .from("products")
      .update({ stock: fallbackStock, has_variants: false })
      .eq("id", productId);
    if (error) return error.message;
  }
  return null;
}
