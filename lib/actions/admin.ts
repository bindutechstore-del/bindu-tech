"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, requireAdmin, requirePermission } from "@/lib/auth/session";
import { takaToPaisa } from "@/lib/utils/money";
import { isManualSubmission } from "@/lib/payments/manual";
import {
  HIGHLIGHT_BODY_MAX,
  HIGHLIGHT_SLOTS,
  HIGHLIGHT_TITLE_MAX,
  sanitiseHighlights,
} from "@/lib/content/highlights";
import type { OrderStatus } from "@/types/database";
import {
  sanitiseTheme,
  COLOR_FIELDS,
  DEFAULT_THEME,
} from "@/lib/theme/schema";

/**
 * Admin mutations.
 *
 * Two rules hold throughout:
 *   1. Every action calls requireStaff() (or requireAdmin()) before touching
 *      anything. The service-role client ignores RLS, so this IS the check.
 *   2. Order status changes go through update_order_status(), never a direct
 *      UPDATE — the SQL function owns the legal-transition table and the stock
 *      restoration, and doing it here would duplicate both.
 */

export interface AdminState {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}

/** Hosts next.config.ts `images.remotePatterns` allows. Keep the two in step. */
function isServableImageHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
    return host === supabaseHost || host === "images.unsplash.com";
  } catch {
    return false;
  }
}

// Accents are dropped rather than turned into hyphens ("Numériques" was
// becoming "nume-riques"), and the length is cut BEFORE the edge hyphens are
// trimmed — cutting after could leave a trailing "-" that the slug CHECK
// constraints reject.
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");

// ── Orders ──────────────────────────────────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
): Promise<AdminState> {
  await requirePermission("orders");
  // The user-scoped client on purpose: update_order_status() re-checks
  // is_staff() internally, so the caller's identity must reach Postgres.
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: note ?? null,
  });

  if (error) {
    if (error.message.includes("illegal_transition")) {
      return { ok: false, error: "That status change is not allowed from here." };
    }
    if (error.message.includes("forbidden")) {
      return { ok: false, error: "You do not have permission to do that." };
    }
    return { ok: false, error: "Could not update the order." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: `Order marked ${status.replace(/_/g, " ")}.` };
}

export async function saveInternalNote(
  orderId: string,
  note: string,
): Promise<AdminState> {
  await requirePermission("orders");
  const db = createAdminClient();

  const { error } = await db
    .from("orders")
    .update({ internal_note: note || null })
    .eq("id", orderId);

  if (error) return { ok: false, error: "Could not save the note." };

  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Note saved." };
}

// ── Products ────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().trim().min(2, "Give the product a name").max(200),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  sku: z.string().trim().min(1, "SKU is required").max(60),
  category_id: z.string().uuid().optional().or(z.literal("")),
  brand_id: z.string().uuid().optional().or(z.literal("")),
  price: z.coerce.number().positive("Price must be above zero"),
  compare_at: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  stock: z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  points_per_purchase: z.coerce.number().int().min(0).max(100000).default(0),
  short_description: z.string().trim().max(400).optional().or(z.literal("")),
  description: z.string().trim().max(20000).optional().or(z.literal("")),
  warranty: z.string().trim().max(200).optional().or(z.literal("")),
  delivery_note: z.string().trim().max(300).optional().or(z.literal("")),
  thumbnail_url: z.string().trim().url().optional().or(z.literal("")),
  video_url: z.string().trim().url().optional().or(z.literal("")),
  status: z.enum(["draft", "active", "archived"]),
  is_featured: z.coerce.boolean().optional().default(false),
  is_new_arrival: z.coerce.boolean().optional().default(false),
  is_best_seller: z.coerce.boolean().optional().default(false),
  /** Newline-separated in the form, text[] in the database. */
  features: z.string().optional().or(z.literal("")),
  /** One "Label: value" per line. */
  specifications: z.string().optional().or(z.literal("")),
});

export async function saveProduct(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission("products");

  const raw = Object.fromEntries(formData);
  const parsed = productSchema.safeParse({
    ...raw,
    is_featured: formData.get("is_featured") === "on",
    is_new_arrival: formData.get("is_new_arrival") === "on",
    is_best_seller: formData.get("is_best_seller") === "on",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: zodErrors(parsed.error),
    };
  }

  const d = parsed.data;
  const id = String(formData.get("id") ?? "");

  // Https only: these land in <img src> on the storefront, and a javascript:
  // or http: URL has no business there. Capped at the uploader's limit.
  //
  // And only from a host next.config.ts lets next/image serve. Any other host
  // saves fine and then renders as a broken picture on every product card,
  // which is worse than refusing it here.
  const imageUrls = formData
    .getAll("image_urls")
    .map((v) => String(v).trim())
    .filter((u) => /^https:\/\/\S+$/i.test(u) && isServableImageHost(u))
    .slice(0, 8);
  const picturesOnForm = formData.has("image_urls__on");

  const compareAt = d.compare_at ? takaToPaisa(d.compare_at) : null;
  const price = takaToPaisa(d.price);

  // Mirrors the products_compare_at_sane CHECK, so the operator gets a sentence
  // instead of a constraint violation.
  if (compareAt !== null && compareAt <= price) {
    return {
      ok: false,
      error: "The compare-at price must be higher than the selling price.",
      fieldErrors: { compare_at: "Must be above the selling price" },
    };
  }

  const row = {
    name: d.name,
    slug: d.slug || slugify(d.name),
    sku: d.sku,
    category_id: d.category_id || null,
    brand_id: d.brand_id || null,
    price_paisa: price,
    compare_at_paisa: compareAt,
    cost_paisa: d.cost ? takaToPaisa(d.cost) : null,
    stock: d.stock,
    low_stock_threshold: d.low_stock_threshold,
    points_per_purchase: d.points_per_purchase,
    short_description: d.short_description || null,
    description: d.description || null,
    warranty: d.warranty || null,
    delivery_note: d.delivery_note || null,
    // The uploader posts the pictures in display order; the first is the main
    // one. With the uploader on the form, no pictures means none — removing
    // the last one must clear the thumbnail, not quietly keep the old one.
    // A tab opened before the uploader shipped still posts thumbnail_url.
    thumbnail_url: picturesOnForm ? (imageUrls[0] ?? null) : (d.thumbnail_url || null),
    video_url: d.video_url || null,
    status: d.status,
    is_featured: d.is_featured,
    is_new_arrival: d.is_new_arrival,
    is_best_seller: d.is_best_seller,
    features: (d.features ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    specifications: (d.specifications ?? "")
      .split("\n")
      .map((line) => {
        const idx = line.indexOf(":");
        if (idx === -1) return null;
        return {
          label: line.slice(0, idx).trim(),
          value: line.slice(idx + 1).trim(),
        };
      })
      .filter((s): s is { label: string; value: string } => Boolean(s?.label && s.value)),
  };

  const db = createAdminClient();
  // `.select("id")` so a NEW product hands back the id its gallery rows need.
  const { data: saved, error } = id
    ? await db.from("products").update(row).eq("id", id).select("id").single()
    : await db.from("products").insert(row).select("id").single();

  if (error || !saved) {
    if (error?.code === "23505") {
      return { ok: false, error: "That slug or SKU is already in use." };
    }
    return { ok: false, error: error?.message ?? "Could not save the product." };
  }

  // Replace the gallery wholesale. Diffing old against new saves nothing worth
  // having at eight rows, and "what you see in the form is what is stored"
  // is easier to trust than a merge.
  if (picturesOnForm) {
    const productId = (saved as { id: string }).id;
    await db.from("product_images").delete().eq("product_id", productId);

    if (imageUrls.length > 0) {
      const { error: imgError } = await db.from("product_images").insert(
        imageUrls.map((url, position) => ({
          product_id: productId,
          url,
          alt: d.name,
          position,
        })),
      );
      if (imgError) {
        return {
          ok: false,
          error: `Product saved, but its pictures were not: ${imgError.message}`,
        };
      }
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Product updated." : "Product created." };
}

export async function setProductStatus(
  id: string,
  status: "draft" | "active" | "archived",
): Promise<AdminState> {
  await requirePermission("products");
  const db = createAdminClient();

  const { error } = await db.from("products").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Could not change the status." };

  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true, message: `Product ${status}.` };
}

/** Archive rather than delete — order_items reference products by id. */
export async function archiveProduct(id: string): Promise<AdminState> {
  return setProductStatus(id, "archived");
}

/**
 * The storage path of a picture in the product-images bucket, or null for
 * anything else (another bucket, images.unsplash.com, a malformed URL).
 */
function productImagePath(url: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const prefix = `${base.replace(/\/+$/, "")}/storage/v1/object/public/product-images/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  return path && !path.includes("..") ? path : null;
}

/**
 * Delete a product for good.
 *
 * Archiving hides a product and can be undone; this cannot. What goes with
 * it is decided by the foreign keys: its gallery, variants, reviews, carts,
 * wishlists, flash-sale slots, quantity rules and bundle memberships all
 * cascade. Past ORDERS do not: order_items is `on delete set null` and keeps
 * its own snapshot of the name, SKU, price and picture, so every invoice
 * still reads exactly as it did.
 *
 * The picture files are removed from storage too — the free tier has 1 GB —
 * except any file another product still shows or an order line still points
 * at, since the order snapshot stores the picture's URL, not a copy.
 *
 * Bundles that contain the product are deleted with it. The cascade would
 * otherwise remove just this product from the bundle, and quote_cart would
 * then award the bundle's discount to the product(s) left in it — "Phone +
 * Case, 15% off" silently becoming "Phone, 15% off".
 */
export async function deleteProduct(id: string): Promise<AdminState> {
  await requirePermission("products");
  const db = createAdminClient();

  const [{ data: product }, { data: gallery }, { data: memberships, error: bundleError }] =
    await Promise.all([
      db.from("products").select("id, name, thumbnail_url").eq("id", id).maybeSingle(),
      db.from("product_images").select("url").eq("product_id", id),
      db.from("bundle_items").select("bundle_id").eq("product_id", id),
    ]);
  if (!product) return { ok: false, error: "That product no longer exists." };
  if (bundleError) return { ok: false, error: "Could not check its bundles. Try again." };

  const bundleIds = [
    ...new Set(((memberships ?? []) as { bundle_id: string }[]).map((m) => m.bundle_id)),
  ];
  let removedBundles: string[] = [];
  if (bundleIds.length > 0) {
    const { data: gone, error } = await db
      .from("bundles")
      .delete()
      .in("id", bundleIds)
      .select("name");
    // Refuse rather than delete the product and leave a discount leaking.
    if (error) return { ok: false, error: "Could not remove its bundles, so nothing was deleted." };
    removedBundles = ((gone ?? []) as { name: string }[]).map((b) => b.name);
  }

  const urls = [
    ...new Set(
      [product.thumbnail_url, ...((gallery ?? []) as { url: string }[]).map((g) => g.url)].filter(
        (u): u is string => Boolean(u),
      ),
    ),
  ];

  const { error } = await db.from("products").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "Could not delete the product. Archive it instead." };
  }

  // Best effort, after the row is gone: a leftover file costs a few hundred
  // KB, a failed delete of the product would cost the operator a retry. And
  // fail CLOSED: if any "is this file still used?" check errors, keep every
  // file — deleting one an old order still shows would break that invoice.
  const owned = urls.filter((u) => productImagePath(u));
  if (owned.length > 0) {
    const [thumbsRes, galleryRes, linesRes, variantsRes] = await Promise.all([
      db.from("products").select("thumbnail_url").in("thumbnail_url", owned),
      db.from("product_images").select("url").in("url", owned),
      db.from("order_items").select("image_url").in("image_url", owned),
      db.from("product_variants").select("image_url").in("image_url", owned),
    ]);
    const checksOk = [thumbsRes, galleryRes, linesRes, variantsRes].every((r) => !r.error);
    const otherThumbs = thumbsRes.data;
    const otherGallery = galleryRes.data;
    const orderLines = linesRes.data;
    const stillUsed = new Set<string>([
      ...((otherThumbs ?? []) as { thumbnail_url: string }[]).map((r) => r.thumbnail_url),
      ...((otherGallery ?? []) as { url: string }[]).map((r) => r.url),
      ...((orderLines ?? []) as { image_url: string }[]).map((r) => r.image_url),
      ...((variantsRes.data ?? []) as { image_url: string }[]).map((r) => r.image_url),
    ]);
    const paths = (checksOk ? owned : [])
      .filter((u) => !stillUsed.has(u))
      .map(productImagePath)
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await db.storage.from("product-images").remove(paths);
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return {
    ok: true,
    message:
      removedBundles.length > 0
        ? `“${product.name}” deleted, with ${removedBundles.length === 1 ? "the bundle" : "the bundles"} ${removedBundles.map((n) => `“${n}”`).join(", ")}.`
        : `“${product.name}” deleted.`,
  };
}

export async function adjustStock(id: string, stock: number): Promise<AdminState> {
  await requirePermission("stock");
  if (!Number.isInteger(stock) || stock < 0) {
    return { ok: false, error: "Stock must be a whole number, zero or more." };
  }

  const db = createAdminClient();
  const { error } = await db.from("products").update({ stock }).eq("id", id);
  if (error) return { ok: false, error: "Could not update stock." };

  revalidatePath("/admin/stock");
  revalidatePath("/admin/products");
  return { ok: true, message: "Stock updated." };
}

// ── Categories ──────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
  image_url: z
    .string()
    .trim()
    .url()
    .refine(isServableImageHost, "Upload the picture here instead of linking it.")
    .optional()
    .or(z.literal("")),
  position: z.coerce.number().int().min(0).default(0),
});

export async function saveCategory(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission("categories");
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, error: "Check the fields.", fieldErrors: zodErrors(parsed.error) };
  }

  const id = String(formData.get("id") ?? "");
  const db = createAdminClient();

  // One level of nesting: a main category and its sub-categories. The parent
  // must itself be a main category, and a category that already has
  // sub-categories cannot move under another — so no chain, and no loop.
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  if (parentId) {
    if (parentId === id) {
      return { ok: false, error: "A category cannot be its own parent." };
    }
    const [{ data: parent }, { count: ownChildren }] = await Promise.all([
      db.from("categories").select("id, parent_id").eq("id", parentId).maybeSingle(),
      id
        ? db.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id)
        : Promise.resolve({ count: 0 }),
    ]);
    if (!parent) return { ok: false, error: "That parent category no longer exists." };
    if (parent.parent_id) {
      return { ok: false, error: "Choose a main category as the parent, not a sub-category." };
    }
    if ((ownChildren ?? 0) > 0) {
      return {
        ok: false,
        error: "This category has its own sub-categories, so it must stay a main category.",
      };
    }
  }

  const row = {
    name: parsed.data.name,
    slug: parsed.data.slug || slugify(parsed.data.name),
    parent_id: parentId,
    description: parsed.data.description || null,
    icon: parsed.data.icon || null,
    image_url: parsed.data.image_url || null,
    position: parsed.data.position,
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
  };

  // Needed to tell whether a save renamed the category (see below).
  const { data: before } = id
    ? await db.from("categories").select("name").eq("id", id).maybeSingle()
    : { data: null };

  const { error } = id
    ? await db.from("categories").update(row).eq("id", id)
    : await db.from("categories").insert(row);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That slug is taken." };
    return { ok: false, error: error.message };
  }

  if (id && before && before.name !== row.name) {
    await refreshProductSearch(db, "category_id", id);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Category updated." : "Category created." };
}

export async function deleteCategory(id: string): Promise<AdminState> {
  await requirePermission("categories");
  const db = createAdminClient();

  // Sub-categories would silently become main categories (parent_id is ON
  // DELETE SET NULL) and appear in the nav and homepage — say so instead.
  const { count: children } = await db
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);
  if ((children ?? 0) > 0) {
    return {
      ok: false,
      error: `${children} sub-${children === 1 ? "category is" : "categories are"} inside this one. Move or delete ${children === 1 ? "it" : "them"} first.`,
    };
  }

  // products.category_id is ON DELETE SET NULL, so the products survive — but
  // an operator deleting a category rarely means "orphan 40 products".
  const { count } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `${count} products still use this category. Move them first, or deactivate the category instead.`,
    };
  }

  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete that category." };

  revalidatePath("/admin/categories");
  return { ok: true, message: "Category deleted." };
}

// ── Coupons ─────────────────────────────────────────────────────────────────

const couponSchema = z.object({
  code: z.string().trim().min(3).max(24).transform((s) => s.toUpperCase()),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().positive(),
  min_order: z.coerce.number().min(0).default(0),
  max_discount: z.coerce.number().optional(),
  starts_at: z.string().optional().or(z.literal("")),
  expires_at: z.string().optional().or(z.literal("")),
  usage_limit: z.coerce.number().int().positive().optional(),
  per_user_limit: z.coerce.number().int().positive().default(1),
});

export async function saveCoupon(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission("coupons");
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, error: "Check the fields.", fieldErrors: zodErrors(parsed.error) };
  }

  const d = parsed.data;

  if (d.discount_type === "percentage" && d.discount_value > 100) {
    return {
      ok: false,
      error: "A percentage discount cannot exceed 100.",
      fieldErrors: { discount_value: "Maximum 100" },
    };
  }

  const id = String(formData.get("id") ?? "");
  const row = {
    code: d.code,
    description: d.description || null,
    discount_type: d.discount_type,
    // Percentage is stored as whole percent; fixed is stored as paisa.
    discount_value:
      d.discount_type === "percentage"
        ? Math.round(d.discount_value)
        : takaToPaisa(d.discount_value),
    min_order_paisa: takaToPaisa(d.min_order),
    max_discount_paisa: d.max_discount ? takaToPaisa(d.max_discount) : null,
    starts_at: d.starts_at || null,
    expires_at: d.expires_at || null,
    usage_limit: d.usage_limit ?? null,
    per_user_limit: d.per_user_limit,
    is_active: formData.get("is_active") === "on",
  };

  const db = createAdminClient();
  const { error } = id
    ? await db.from("coupons").update(row).eq("id", id)
    : await db.from("coupons").insert(row);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That code already exists." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/coupons");
  return { ok: true, message: id ? "Coupon updated." : "Coupon created." };
}

export async function toggleCoupon(id: string, active: boolean): Promise<AdminState> {
  await requirePermission("coupons");
  const db = createAdminClient();
  const { error } = await db.from("coupons").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: "Could not update the coupon." };
  revalidatePath("/admin/coupons");
  return { ok: true };
}

// ── Banners ─────────────────────────────────────────────────────────────────

export async function saveBanner(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission("banners");

  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const title = get("title");
  if (!title) return { ok: false, error: "A banner needs a title." };

  const accent = get("accent_hex");
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return { ok: false, error: "Accent must be a hex colour like #1B4DFF." };
  }

  // The hero renders through next/image, which throws for a host it has not
  // been told about, so one pasted link from elsewhere would take the homepage
  // down with it. The form only uploads now; this holds the line server-side.
  const imageUrl = get("image_url");
  if (imageUrl && !(/^https:\/\/\S+$/i.test(imageUrl) && isServableImageHost(imageUrl))) {
    return { ok: false, error: "Upload the banner picture here rather than linking it." };
  }

  const id = String(formData.get("id") ?? "");
  const row = {
    placement: get("placement") ?? "hero",
    title,
    subtitle: get("subtitle"),
    eyebrow: get("eyebrow"),
    image_url: imageUrl,
    cta_label: get("cta_label"),
    cta_href: get("cta_href"),
    secondary_cta_label: get("secondary_cta_label"),
    secondary_cta_href: get("secondary_cta_href"),
    accent_hex: accent,
    priority: Number(formData.get("priority") ?? 0) || 0,
    is_active: formData.get("is_active") === "on",
  };

  const db = createAdminClient();
  const { error } = id
    ? await db.from("banners").update(row).eq("id", id)
    : await db.from("banners").insert(row);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, message: id ? "Banner updated." : "Banner created." };
}

export async function deleteBanner(id: string): Promise<AdminState> {
  await requirePermission("banners");
  const db = createAdminClient();
  const { error } = await db.from("banners").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete that banner." };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, message: "Banner deleted." };
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function moderateReview(
  id: string,
  status: "approved" | "rejected",
): Promise<AdminState> {
  const staff = await requirePermission("reviews");
  const db = createAdminClient();

  // The rollup trigger on reviews keeps products.rating_* in step with this.
  const { error } = await db
    .from("reviews")
    .update({
      status,
      moderated_by: staff.id,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Could not moderate that review." };

  revalidatePath("/admin/reviews");
  return { ok: true, message: `Review ${status}.` };
}

// ── Customers / roles ───────────────────────────────────────────────────────

export async function setUserRole(
  userId: string,
  role: "customer" | "manager" | "admin",
): Promise<AdminState> {
  // Role management is admin-only — a manager cannot promote themselves.
  const actor = await requireAdmin();

  if (userId === actor.id) {
    return { ok: false, error: "You cannot change your own role." };
  }

  const db = createAdminClient();

  // Roles are additive rows; replace the set rather than accumulating.
  await db.from("user_roles").delete().eq("user_id", userId);
  const { error } = await db
    .from("user_roles")
    .insert({ user_id: userId, role, granted_by: actor.id });

  if (error) return { ok: false, error: "Could not change that role." };

  revalidatePath("/admin/customers");
  return { ok: true, message: `Role set to ${role}.` };
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function saveSetting(
  key: string,
  value: unknown,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const db = createAdminClient();

  const { error } = await db
    .from("settings")
    .update({ value, updated_by: actor.id })
    .eq("key", key);

  if (error) return { ok: false, error: "Could not save that setting." };

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

/**
 * Settings the Settings page may CREATE when the row is missing — the ones
 * added after migration 0013 seeded the rest. Anything else must already
 * exist: a crafted form cannot invent keys.
 */
const CONTENT_SETTINGS: Record<string, string> = {
  home_highlights: "Homepage “Buying from” cards",
  home_delivery_note: "Homepage Delivery card text (empty = written from the delivery zones)",
  social_links: "Footer social links",
};

const SOCIAL_NETWORKS = ["facebook", "instagram", "youtube"] as const;

/**
 * The plain settings that are numbers. Everything else is saved as text —
 * including a value an older version of this form stored as a number by
 * mistake (a phone typed 01712345678 became 1712345678), so saving the
 * corrected value repairs it instead of dropping the zero again.
 */
const NUMERIC_SETTINGS = new Set([
  "return_window_days",
  "low_stock_banner_threshold",
  "cod_advance_threshold_paisa",
  "analytics_retention_days",
]);

export async function saveSettings(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const db = createAdminClient();

  const { data: rows } = await db.from("settings").select("key, value");
  const current = new Map(
    ((rows ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value]),
  );

  const writes: { key: string; value: unknown }[] = [];
  const fieldErrors: Record<string, string> = {};

  // ── Plain values ──────────────────────────────────────────────────────────
  for (const [field, raw] of formData.entries()) {
    if (!field.startsWith("setting__")) continue;
    const key = field.slice("setting__".length);
    if (!current.has(key) && !(key in CONTENT_SETTINGS)) continue;

    const was = current.get(key);
    // Objects and lists have their own fields below (or their own page).
    if (was !== null && typeof was === "object") continue;

    const text = String(raw).trim();
    let value: unknown = text;

    // Numbers only for the settings that are numbers. This used to turn ANY
    // all-digit entry into one, so a phone typed as 01712345678 was saved as
    // 1712345678 — the leading zero gone.
    if (NUMERIC_SETTINGS.has(key)) {
      if (!/^\d+$/.test(text)) {
        fieldErrors[key] = "Whole numbers only.";
        continue;
      }
      value = Number(text);
    }

    if (key === "store_name" && !text) {
      fieldErrors[key] = "The store needs a name.";
      continue;
    }
    if (key === "support_email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      // The footer turns this into a mailto: link; "bindutech.com" made one
      // that opened an email to nobody.
      fieldErrors[key] = "Enter a full email address, like support@example.com.";
      continue;
    }
    writes.push({ key, value });
  }

  // ── Social links (footer icons, chat bubble) ──────────────────────────────
  if (SOCIAL_NETWORKS.some((n) => formData.has(`social__${n}`))) {
    const links: Record<string, string> = {};

    // Messenger links are m.me/<page username>. Accept the username or a
    // pasted m.me / facebook.com link and keep just the username.
    const rawMessenger = String(formData.get("social__messenger") ?? "").trim();
    if (rawMessenger) {
      // A page without a username has a link like
      // facebook.com/profile.php?id=61550000000000 — m.me works with that id.
      const byId = rawMessenger.match(/profile\.php\?(?:.*&)?id=(\d{5,20})/i);
      const username = byId
        ? byId[1]
        : rawMessenger
            .replace(/^https?:\/\/(www\.|web\.)?(m\.me|facebook\.com|fb\.com)\//i, "")
            .replace(/[/?#].*$/, "");
      const reserved = /^(profile\.php|pages|people|groups|events|watch|messages)$/i;
      if (/^[A-Za-z0-9.]{5,60}$/.test(username) && !reserved.test(username)) {
        links.messenger = username;
      } else {
        fieldErrors.social__messenger =
          "Use the page's username (e.g. bindutech) or paste its facebook.com link.";
      }
    }

    for (const net of SOCIAL_NETWORKS) {
      const url = String(formData.get(`social__${net}`) ?? "").trim();
      if (!url) continue;
      if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(url)) {
        fieldErrors[`social__${net}`] = "Paste the full link, starting with https://";
        continue;
      }
      links[net] = url.replace(/^http:\/\//i, "https://");
    }
    writes.push({ key: "social_links", value: links });
  }

  // ── Homepage "Buying from" cards ──────────────────────────────────────────
  if (formData.has("highlight__0__title")) {
    const cards = Array.from({ length: HIGHLIGHT_SLOTS }, (_, i) => ({
      icon: String(formData.get(`highlight__${i}__icon`) ?? ""),
      title: String(formData.get(`highlight__${i}__title`) ?? ""),
      body: String(formData.get(`highlight__${i}__body`) ?? ""),
    }));
    cards.forEach((c, i) => {
      if (c.title.trim().length > HIGHLIGHT_TITLE_MAX) {
        fieldErrors[`highlight__${i}__title`] = `Keep it under ${HIGHLIGHT_TITLE_MAX} characters.`;
      }
      if (c.body.trim().length > HIGHLIGHT_BODY_MAX) {
        fieldErrors[`highlight__${i}__body`] = `Keep it under ${HIGHLIGHT_BODY_MAX} characters.`;
      }
    });
    // A card with neither title nor text is dropped — that is how one is
    // removed from the homepage.
    writes.push({ key: "home_highlights", value: sanitiseHighlights(cards) });
  }

  // ── Checkout & rewards rules ──────────────────────────────────────────────
  // Read by quote_cart / place_order in SQL, which cast each value to a
  // number, so they are saved as numbers in exactly the stored shape. The form
  // speaks taka; the database speaks paisa.
  if (formData.has("rules__on")) {
    const num = (
      field: string,
      min: number,
      max: number,
      opts: { integer?: boolean; label: string },
    ): number | null => {
      const raw = String(formData.get(field) ?? "").trim();
      const n = Number(raw);
      if (raw === "" || !Number.isFinite(n) || n < min || n > max || (opts.integer && !Number.isInteger(n))) {
        fieldErrors[field] = `${opts.label}: ${min}–${max}${opts.integer ? ", whole numbers" : ""}.`;
        return null;
      }
      return n;
    };
    const on = (field: string) => formData.get(field) === "on";

    const advPercent = num("rules__advance_percent", 1, 100, { label: "Percent" });
    const advMin = num("rules__advance_min", 0, 1_000_000, { integer: true, label: "Taka" });
    const windowMinutes = num("rules__payment_window", 5, 1440, { integer: true, label: "Minutes" });
    const pointValue = num("rules__points_value", 0.01, 1000, { label: "Taka" });
    const pointsMin = num("rules__points_min", 0, 1_000_000, { integer: true, label: "Points" });
    const refNew = num("rules__referral_new", 0, 100_000, { integer: true, label: "Taka" });
    const refReferrer = num("rules__referral_referrer", 0, 100_000, { integer: true, label: "Taka" });
    const prepaid = {
      bkash: num("rules__prepaid_bkash", 0, 10_000, { integer: true, label: "Taka" }),
      nagad: num("rules__prepaid_nagad", 0, 10_000, { integer: true, label: "Taka" }),
      card: num("rules__prepaid_card", 0, 10_000, { integer: true, label: "Taka" }),
    };

    if (
      advPercent !== null && advMin !== null && windowMinutes !== null &&
      pointValue !== null && pointsMin !== null && refNew !== null && refReferrer !== null &&
      prepaid.bkash !== null && prepaid.nagad !== null && prepaid.card !== null
    ) {
      writes.push(
        {
          key: "advance_payment",
          value: {
            enabled: on("rules__advance_enabled"),
            percent: Math.round(advPercent * 10) / 10,
            min_paisa: advMin * 100,
          },
        },
        { key: "payment_window", value: { minutes: windowMinutes } },
        {
          key: "points_rules",
          value: {
            enabled: on("rules__points_enabled"),
            paisa_per_point: Math.round(pointValue * 100),
            min_redeem_points: pointsMin,
          },
        },
        {
          key: "referral_reward",
          value: {
            enabled: on("rules__referral_enabled"),
            referred_paisa: refNew * 100,
            referrer_paisa: refReferrer * 100,
          },
        },
        {
          key: "delivery_payment_adjust",
          // A discount is stored as a negative adjustment. Cash on delivery
          // and "other" are not on the form and keep whatever they hold. A
          // positive value (a surcharge, set in the table editor) cannot be
          // shown as a discount; the form renders it as 0, so a 0 coming back
          // for such a method means "untouched" and the surcharge is kept.
          value: (() => {
            const prev = (current.get("delivery_payment_adjust") ?? {}) as Record<string, number>;
            const next: Record<string, number> = { ...prev };
            for (const m of ["bkash", "nagad", "card"] as const) {
              const off = prepaid[m] as number;
              next[m] = off === 0 && Number(prev[m]) > 0 ? Number(prev[m]) : -off * 100;
            }
            return next;
          })(),
        },
      );
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Some fields need fixing. Nothing was saved.",
      fieldErrors,
    };
  }

  const results = await Promise.all(
    writes.map((w) =>
      current.has(w.key)
        ? db.from("settings").update({ value: w.value, updated_by: actor.id }).eq("key", w.key)
        : db.from("settings").insert({
            key: w.key,
            value: w.value,
            is_public: true,
            description: CONTENT_SETTINGS[w.key] ?? null,
            updated_by: actor.id,
          }),
    ),
  );
  if (results.some((r) => r.error)) {
    return { ok: false, error: "Some settings could not be saved. Try again." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved. The storefront shows them now." };
}

// ── Delivery zones ──────────────────────────────────────────────────────────

export async function saveDeliveryZone(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission("settings");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "The zone needs a name." };

  const minDays = Number(formData.get("min_days") ?? 1);
  const maxDays = Number(formData.get("max_days") ?? 3);
  if (maxDays < minDays) {
    return { ok: false, error: "Maximum days cannot be less than minimum days." };
  }

  const freeAbove = String(formData.get("free_above") ?? "").trim();

  const row = {
    name,
    slug: String(formData.get("slug") ?? "").trim() || slugify(name),
    fee_paisa: takaToPaisa(String(formData.get("fee") ?? "0")),
    free_above_paisa: freeAbove ? takaToPaisa(freeAbove) : null,
    min_days: minDays,
    max_days: maxDays,
    districts: String(formData.get("districts") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    is_active: formData.get("is_active") === "on",
  };

  const db = createAdminClient();
  const { error } = id
    ? await db.from("delivery_zones").update(row).eq("id", id)
    : await db.from("delivery_zones").insert(row);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Delivery zone saved." };
}

// ── Manual payment verification ─────────────────────────────────────────────

/**
 * Approve or reject a customer-submitted bKash/Nagad transfer.
 *
 * The decision itself lives in `verify_manual_payment()`, which re-checks the
 * caller's permission in SQL and records who decided. Approving settles the
 * payment and confirms the order; rejecting deliberately leaves the order alive
 * so the customer can correct a mistyped transaction ID and resubmit.
 */
export async function verifyManualPayment(
  paymentId: string,
  approve: boolean,
  reason?: string,
): Promise<AdminState> {
  const actor = await requirePermission("payments");
  const db = createAdminClient();

  const { data: payment } = await db
    .from("payments")
    .select("id, order_id, status, amount_paisa, provider, idempotency_key, provider_txn_id")
    .eq("id", paymentId)
    .maybeSingle<{
      id: string;
      order_id: string;
      status: string;
      amount_paisa: number;
      provider: string;
      idempotency_key: string | null;
      provider_txn_id: string | null;
    }>();

  if (!payment) return { ok: false, error: "That payment no longer exists." };
  if (!isManualSubmission(payment.idempotency_key)) {
    return { ok: false, error: "That payment is not a manual submission." };
  }
  // Idempotent: a second approval of a settled payment is a no-op, not a
  // double-confirm.
  if (payment.status === "successful") {
    return { ok: true, message: "That payment was already verified." };
  }

  const { data: order } = await db
    .from("orders")
    .select("id, order_number, status")
    .eq("id", payment.order_id)
    .maybeSingle<{ id: string; order_number: string; status: string }>();

  if (!order) return { ok: false, error: "That order no longer exists." };

  if (approve) {
    await db
      .from("payments")
      .update({
        status: "successful",
        settled_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq("id", payment.id);

    await db
      .from("orders")
      .update({ payment_status: "successful" })
      .eq("id", order.id);

    // A verified payment confirms the order, mirroring settle_payment().
    if (order.status === "placed") {
      await db
        .from("orders")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", order.id);

      await db.from("order_status_history").insert({
        order_id: order.id,
        status: "confirmed",
        note: "Payment verified",
        changed_by: actor.id,
      });
    }
  } else {
    await db
      .from("payments")
      .update({
        status: "failed",
        failure_reason: reason?.trim() || "Could not verify this payment",
      })
      .eq("id", payment.id);

    // The order is deliberately NOT cancelled: a mistyped transaction ID
    // should cost a correction, not the sale.
    await db
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id);
  }

  await db.from("payment_transactions").insert({
    payment_id: payment.id,
    event: approve ? "manual_approve" : "manual_reject",
    status: approve ? "successful" : "failed",
    amount_paisa: payment.amount_paisa,
    payload: {
      verified_by: actor.id,
      verified_by_name: actor.profile?.full_name ?? actor.email,
      verified_at: new Date().toISOString(),
      reason: reason ?? null,
      txn_id: payment.provider_txn_id,
    },
  });

  // Who decided what, in the tamper-evident log.
  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: approve ? "payment.verify" : "payment.reject",
    p_entity_type: "payment",
    p_entity_id: payment.id,
    p_changes: {
      order: order.order_number,
      txn: payment.provider_txn_id,
      reason: reason ?? null,
    },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  return {
    ok: true,
    message: approve ? "Payment verified and order confirmed." : "Payment rejected.",
  };
}

/**
 * A short-lived signed URL for a payment screenshot.
 *
 * The `payment-proofs` bucket is private — a screenshot shows a wallet balance
 * and a phone number, so it must never be reachable by URL guessing.
 */
export async function getProofUrl(path: string): Promise<string | null> {
  await requirePermission("payments");
  const db = createAdminClient();

  const { data } = await db.storage
    .from("payment-proofs")
    .createSignedUrl(path, 300); // 5 minutes is plenty to look at one image

  return data?.signedUrl ?? null;
}

// ── Staff and permissions ───────────────────────────────────────────────────

/**
 * Set someone's role and, for managers, exactly which admin sections they can
 * open. Admins are unrestricted by design; customers have no admin surface.
 *
 * `set_staff_access()` refuses to let an admin change their own access, because
 * that is the one mistake with no in-app recovery.
 */
export async function setStaffAccess(
  userId: string,
  role: "customer" | "manager" | "admin",
  permissions: string[],
): Promise<AdminState> {
  const actor = await requireAdmin();

  if (userId === actor.id) {
    return { ok: false, error: "You cannot change your own access." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_staff_access", {
    p_user_id: userId,
    p_role: role,
    p_permissions: role === "manager" ? permissions : [],
  });

  if (!error) {
    revalidatePath("/admin/staff");
    revalidatePath("/admin/customers");
    return { ok: true, message: "Access updated." };
  }

  if (error.message.includes("cannot_change_own_access")) {
    return { ok: false, error: "You cannot change your own access." };
  }
  if (error.message.includes("forbidden")) {
    return { ok: false, error: "Only a full admin can manage staff." };
  }

  // set_staff_access() and staff_permissions arrive with migration 0015. Until
  // it is applied, fall back to setting the role alone — that still works, and
  // a manager without the grants table simply has the old all-or-nothing
  // access rather than no access.
  const db = createAdminClient();
  await db.from("user_roles").delete().eq("user_id", userId);
  const { error: roleError } = await db
    .from("user_roles")
    .insert({ user_id: userId, role, granted_by: actor.id });

  if (roleError) return { ok: false, error: "Could not update that account." };

  revalidatePath("/admin/staff");
  revalidatePath("/admin/customers");
  return {
    ok: true,
    message:
      "Role updated. Per-section permissions need migration 0015 applied first.",
  };
}

/** Look an account up by email so an admin can promote it to staff. */
export async function findAccountByEmail(
  email: string,
): Promise<{ id: string; email: string | null; full_name: string | null } | null> {
  await requireAdmin();
  const db = createAdminClient();

  const { data } = await db
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", email.trim())
    .maybeSingle<{ id: string; email: string | null; full_name: string | null }>();

  return data ?? null;
}

// ── Site design ─────────────────────────────────────────────────────────────

/**
 * Save the storefront theme.
 *
 * Admin-only, not delegable: a manager with the `settings` grant could
 * otherwise restyle the whole shop. The payload is put through
 * `sanitiseTheme` BEFORE it is written, so the settings row can never hold a
 * colour that is not `#rrggbb` or a font id that is not compiled in — the
 * layout interpolates these straight into a <style> block.
 */
export async function saveSiteTheme(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();

  const colors: Record<string, string> = {};
  for (const { key } of COLOR_FIELDS) {
    colors[key] = String(formData.get(`color__${key}`) ?? "");
  }

  const theme = sanitiseTheme({
    headingFont: String(formData.get("headingFont") ?? ""),
    bodyFont: String(formData.get("bodyFont") ?? ""),
    radius: Number(formData.get("radius")),
    colors,
  });

  const db = createAdminClient();
  const { error } = await db
    .from("settings")
    .upsert(
      {
        key: "site_theme",
        value: theme,
        description: "Storefront colours, fonts and corner radius.",
        // settings.is_public defaults to FALSE and the RLS policy is
        // `using (is_public or is_staff())`, so without this the storefront
        // reads nothing and silently renders the compiled-in defaults while
        // the admin panel shows the saved theme. Colours and font names are
        // visible to every visitor by definition — there is nothing to hide.
        is_public: true,
        updated_by: actor.id,
      },
      { onConflict: "key" },
    );

  if (error) return { ok: false, error: error.message };

  // The theme is read in the root layout, so every route is stale.
  revalidatePath("/", "layout");
  revalidatePath("/admin/design");
  return { ok: true, message: "Design saved." };
}

/** Put the storefront back to the compiled-in design. */
export async function resetSiteTheme(): Promise<AdminState> {
  const actor = await requireAdmin();
  const db = createAdminClient();

  const { error } = await db
    .from("settings")
    .upsert(
      {
        key: "site_theme",
        value: DEFAULT_THEME,
        description: "Storefront colours, fonts and corner radius.",
        is_public: true,
        updated_by: actor.id,
      },
      { onConflict: "key" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/admin/design");
  return { ok: true, message: "Design reset to the defaults." };
}

// ── Promotions ──────────────────────────────────────────────────────────────


// ── Flash sales (the homepage countdown) ────────────────────────────────────
// The storefront and SQL already handle a live sale: FlashSaleSection shows it
// with a countdown, and effective_price() charges the sale price inside the
// window until stock_limit is reached. What was missing was any way for the
// admin to create one — the seeded sale ended and the countdown vanished.

/** "2026-09-28T20:00" typed in Bangladesh time (UTC+6, no DST) → ISO. */
function dhakaInputToIso(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+06:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type FlashSaleState = AdminState & { id?: string };

export async function saveFlashSale(
  _prev: FlashSaleState,
  formData: FormData,
): Promise<FlashSaleState> {
  await requirePermission("coupons");

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const starts = dhakaInputToIso(String(formData.get("starts_at") ?? ""));
  const ends = dhakaInputToIso(String(formData.get("ends_at") ?? ""));

  const fieldErrors: Record<string, string> = {};
  if (title.length < 2 || title.length > 80) fieldErrors.title = "2–80 characters.";
  if (subtitle.length > 120) fieldErrors.subtitle = "Keep it under 120 characters.";
  if (!starts) fieldErrors.starts_at = "Pick a start date and time.";
  if (!ends) fieldErrors.ends_at = "Pick an end date and time.";
  if (starts && ends && ends <= starts) fieldErrors.ends_at = "Must be after the start.";
  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: "Check the fields.", fieldErrors };
  }

  const row = {
    title,
    subtitle: subtitle || null,
    starts_at: starts!,
    ends_at: ends!,
    is_active: formData.get("is_active") === "on",
  };

  const db = createAdminClient();
  const { data, error } = id
    ? await db.from("flash_sales").update(row).eq("id", id).select("id").single()
    : await db.from("flash_sales").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "Could not save the flash sale." };

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Flash sale updated." : "Flash sale created — now add products.", id: data.id };
}

export async function deleteFlashSale(id: string): Promise<AdminState> {
  await requirePermission("coupons");
  const db = createAdminClient();
  // Items cascade. Past orders keep their own prices.
  const { error } = await db.from("flash_sales").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the flash sale." };
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true, message: "Flash sale deleted." };
}

/** Add a product to a sale, or change its sale price / limit if already in. */
export async function saveFlashSaleItem(input: {
  saleId: string;
  productId: string;
  salePriceTaka: number;
  stockLimit: number | null;
}): Promise<AdminState> {
  await requirePermission("coupons");
  const db = createAdminClient();

  const { data: product } = await db
    .from("products")
    .select("id, price_paisa, status")
    .eq("id", input.productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "That product no longer exists." };

  const salePaisa = takaToPaisa(String(input.salePriceTaka));
  if (!Number.isFinite(salePaisa) || salePaisa <= 0) {
    return { ok: false, error: "Enter a sale price above ৳0." };
  }
  // effective_price() ignores a "sale" price that is not below the regular
  // one, so accepting it would show a flash-sale badge with no saving.
  if (salePaisa >= product.price_paisa) {
    return { ok: false, error: "The sale price must be below the product's regular price." };
  }
  const limit = input.stockLimit;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 100000)) {
    return { ok: false, error: "Units for the sale: a whole number, or leave it empty for no limit." };
  }

  const { error } = await db.from("flash_sale_items").upsert(
    {
      flash_sale_id: input.saleId,
      product_id: input.productId,
      sale_price_paisa: salePaisa,
      stock_limit: limit,
    },
    { onConflict: "flash_sale_id,product_id" },
  );
  if (error) return { ok: false, error: "Could not add the product to the sale." };

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: product.status === "active" ? "Added to the sale." : "Added — but the product is not active, so shoppers will not see it.",
  };
}

export async function removeFlashSaleItem(itemId: string): Promise<AdminState> {
  await requirePermission("coupons");
  const db = createAdminClient();
  const { error } = await db.from("flash_sale_items").delete().eq("id", itemId);
  if (error) return { ok: false, error: "Could not remove that product." };
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true, message: "Removed from the sale." };
}

export interface PromotionProduct {
  id: string;
  name: string;
  sku: string;
  price_paisa: number;
  thumbnail_url: string | null;
}

/**
 * Product search for the Promotions page.
 *
 * The page used to load the first 300 products into a dropdown: past 300 the
 * rest could not be chosen at all, and nobody can scan 300 names anyway. This
 * searches the whole catalogue by name or SKU, every word required, so
 * "anker 20000" finds "Anker PowerCore 20,000mAh" whatever the word order.
 */
export async function searchPromotionProducts(query: string): Promise<PromotionProduct[]> {
  await requirePermission("coupons");
  const db = createAdminClient();

  // Characters that are wildcards or filter syntax to PostgREST become
  // spaces: a search box should match what was typed, not be parsed.
  const words = String(query ?? "")
    .replace(/[%_*,()\\"':.]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((w) => w.slice(0, 40));

  let q = db
    .from("products")
    .select("id, name, sku, price_paisa, thumbnail_url")
    .neq("status", "archived")
    .order("name")
    .limit(20);
  for (const w of words) {
    q = q.or(`name.ilike.%${w}%,sku.ilike.%${w}%`);
  }

  const { data, error } = await q;
  // Thrown, so the picker says "could not search" instead of "no product
  // matches" — the second would tell the operator the product does not exist.
  if (error) throw new Error("Product search failed.");
  return (data ?? []) as PromotionProduct[];
}

/**
 * Create a quantity break ("buy N, save X%").
 *
 * Scoped to one product OR one category, never both — the table enforces that,
 * and quote_cart resolves a product rule ahead of a category rule.
 */
export async function saveQuantityBreak(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission("coupons");

  const scope = String(formData.get("scope") ?? "product");
  const targetId = String(formData.get("target_id") ?? "");
  const minQuantity = Number(formData.get("min_quantity"));
  const percent = Number(formData.get("discount_percent"));

  if (!targetId) return { ok: false, error: "Choose a product or category." };
  if (!Number.isInteger(minQuantity) || minQuantity < 2) {
    return { ok: false, error: "Minimum quantity must be 2 or more." };
  }
  if (!(percent > 0 && percent <= 90)) {
    return { ok: false, error: "Discount must be between 1 and 90 percent." };
  }

  const db = createAdminClient();
  const { error } = await db.from("quantity_breaks").insert({
    product_id: scope === "product" ? targetId : null,
    category_id: scope === "category" ? targetId : null,
    min_quantity: minQuantity,
    discount_percent: percent,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That quantity already has a rule here." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true, message: "Quantity break added." };
}

export async function deleteQuantityBreak(id: string): Promise<AdminState> {
  await requirePermission("coupons");
  const db = createAdminClient();
  const { error } = await db.from("quantity_breaks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true, message: "Removed." };
}

/** Create a bundle from two or more products. */
export async function saveBundle(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission("coupons");

  const name = String(formData.get("name") ?? "").trim();
  const percent = Number(formData.get("discount_percent"));
  const productIds = formData.getAll("product_ids").map(String).filter(Boolean);

  if (name.length < 2) return { ok: false, error: "Give the bundle a name." };
  // One product is not a bundle; it is a quantity break.
  if (productIds.length < 2) {
    return { ok: false, error: "Pick at least two products." };
  }
  if (!(percent > 0 && percent <= 90)) {
    return { ok: false, error: "Discount must be between 1 and 90 percent." };
  }

  const db = createAdminClient();
  const slug =
    slugify(name) + "-" + Math.random().toString(36).slice(2, 6);

  const { data: bundle, error } = await db
    .from("bundles")
    .insert({ slug, name, discount_percent: percent })
    .select("id")
    .single();

  if (error || !bundle) return { ok: false, error: error?.message ?? "Could not save." };

  const { error: itemsError } = await db.from("bundle_items").insert(
    [...new Set(productIds)].map((product_id) => ({
      bundle_id: (bundle as { id: string }).id,
      product_id,
    })),
  );

  if (itemsError) {
    // A bundle with no members would silently never fire, so do not leave one.
    await db.from("bundles").delete().eq("id", (bundle as { id: string }).id);
    return { ok: false, error: itemsError.message };
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true, message: "Bundle created." };
}

export async function deleteBundle(id: string): Promise<AdminState> {
  await requirePermission("coupons");
  const db = createAdminClient();
  // bundle_items cascades on the foreign key.
  const { error } = await db.from("bundles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true, message: "Bundle removed." };
}

// ── Credit accounts ─────────────────────────────────────────────────────────

/**
 * Grant or update a customer's credit limit.
 *
 * Admin-only and not delegable: extending credit is deciding how much of the
 * shop's money a customer may hold, which is not a section-level task.
 *
 * The phone is normalised in SQL by the same helper place_order uses, so an
 * account granted to "+8801712345678" is found when the customer types
 * "01712345678" at checkout.
 */
export async function saveCreditAccount(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();

  const rawPhone = String(formData.get("phone") ?? "");
  const holderName = String(formData.get("holder_name") ?? "").trim();
  const limitTaka = Number(formData.get("limit_taka"));

  if (!Number.isFinite(limitTaka) || limitTaka < 0) {
    return { ok: false, error: "Enter a limit of zero or more." };
  }

  const db = createAdminClient();

  const { data: normalised, error: phoneError } = await db.rpc("normalise_bd_phone", {
    p_phone: rawPhone,
  });
  const phone = String(normalised ?? "");

  if (phoneError || !/^01[3-9][0-9]{8}$/.test(phone)) {
    return { ok: false, error: "Enter a valid Bangladeshi mobile number." };
  }

  const { error } = await db.from("credit_accounts").upsert(
    {
      phone,
      holder_name: holderName || null,
      // Taka in the form, paisa in the database — like every other amount.
      limit_paisa: Math.round(limitTaka * 100),
      is_active: formData.get("is_active") !== "off",
      note: String(formData.get("note") ?? "").trim() || null,
      approved_by: actor.id,
    },
    { onConflict: "phone" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/credit");
  return { ok: true, message: `Credit account saved for ${phone}.` };
}

/** Record a repayment against an account. */
export async function recordCreditRepayment(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();

  const phone = String(formData.get("phone") ?? "");
  const amountTaka = Number(formData.get("amount_taka"));

  if (!Number.isFinite(amountTaka) || amountTaka <= 0) {
    return { ok: false, error: "Enter an amount above zero." };
  }

  const db = createAdminClient();

  // Positive delta: a repayment gives headroom back.
  const { error } = await db.from("credit_account_ledger").insert({
    phone,
    delta_paisa: Math.round(amountTaka * 100),
    reason: `Repayment recorded by staff`,
  });

  if (error) return { ok: false, error: error.message };

  void actor;
  revalidatePath("/admin/credit");
  return { ok: true, message: "Repayment recorded." };
}

// ── Brands ──────────────────────────────────────────────────────────────────

const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter a brand name").max(80),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  logo_url: z
    .string()
    .trim()
    .url()
    .refine(isServableImageHost, "Upload the logo here instead of linking it.")
    .optional()
    .or(z.literal("")),
});

/**
 * Create or rename a brand.
 *
 * Brands were only ever written by the seed script, so an operator had no way
 * to add a new maker or fix a misspelling short of the Supabase dashboard.
 * Gated on `products`: whoever may edit the catalogue may name its makers.
 */
export async function saveBrand(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission("products");
  const parsed = brandSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, error: "Check the fields.", fieldErrors: zodErrors(parsed.error) };
  }

  const id = String(formData.get("id") ?? "");
  const name = cleanBrandName(parsed.data.name);
  if (!brandKey(name)) {
    return { ok: false, error: "Enter a brand name.", fieldErrors: { name: "Enter a brand name" } };
  }

  const db = createAdminClient();
  const all = await loadBrands(db);

  const twin = findBrandTwin(all, name, id);
  if (twin) {
    return {
      ok: false,
      error: `A brand called “${twin.name}” already exists.`,
      fieldErrors: { name: "Already exists" },
    };
  }

  // A typed slug is the operator's choice and is checked as given; an empty
  // one is made from the name and made unique.
  const slug = parsed.data.slug || freeBrandSlug(all, name, id);
  // The table enforces this shape with a CHECK; say so in words rather than
  // surfacing a constraint name.
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return {
      ok: false,
      error: "The slug may use lowercase letters, numbers and single hyphens only.",
    };
  }

  const row = {
    name,
    slug,
    logo_url: parsed.data.logo_url || null,
    is_active: formData.get("is_active") === "on",
  };

  const { error } = id
    ? await db.from("brands").update(row).eq("id", id)
    : await db.from("brands").insert(row);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That slug is taken." };
    return { ok: false, error: error.message };
  }

  const previous = id ? all.find((b) => b.id === id) : null;
  if (previous && previous.name !== name) {
    await refreshProductSearch(db, "brand_id", id);
  }

  revalidatePath("/admin/brands");
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Brand updated." : "Brand created." };
}

type BrandLite = { id: string; name: string; slug: string };
type AdminDb = ReturnType<typeof createAdminClient>;

/**
 * The name as stored: Unicode-normalised (the same Bangla letter can arrive as
 * one code point or as two, depending on the keyboard), invisible spaces
 * removed, runs of whitespace collapsed.
 */
function cleanBrandName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[\u200b\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * What makes two brand names "the same maker": case, spacing, punctuation and
 * joiners ignored, so "TP-Link", "tp link" and "TPLink" all match. Letters,
 * combining marks (Bangla vowel signs) and digits are kept, so different
 * Bangla words never collapse into one.
 */
function brandKey(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "");
}

const shortHash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 6);

/**
 * The whole brands table. It is a few dozen rows, and comparing in code is
 * what makes the normalisation above possible — a PostgREST `ilike` could not
 * see through different Unicode forms, and it treats `*` as a wildcard.
 */
async function loadBrands(db: AdminDb): Promise<BrandLite[]> {
  const { data } = await db.from("brands").select("id, name, slug").limit(2000);
  return (data ?? []) as BrandLite[];
}

function findBrandTwin(all: BrandLite[], name: string, exceptId = ""): BrandLite | null {
  const key = brandKey(name);
  return all.find((b) => b.id !== exceptId && brandKey(b.name) === key) ?? null;
}

/**
 * A slug for a new or renamed brand that no OTHER brand holds.
 *
 * slugify keeps only a-z and 0-9, so a name written in Bangla gives nothing
 * and "ওয়ালটন BD" and "মিনিস্টার BD" both give "bd". Those get a short hash of
 * the name instead of — or after — the Latin part. The hash is deterministic,
 * so two people adding the same name at once produce the same slug and the
 * unique index lets exactly one of them through.
 */
function freeBrandSlug(all: BrandLite[], name: string, exceptId = ""): string {
  const hash = shortHash(brandKey(name));
  const base = slugify(name);
  if (!base) return `brand-${hash}`;
  const taken = all.some((b) => b.id !== exceptId && b.slug === base);
  if (!taken) return base;
  // Leave room for "-" + the 6-character hash inside the 80-character limit,
  // so a long name never has its hash cut off back into the taken slug.
  const room = base.slice(0, 73).replace(/-+$/, "");
  return room ? `${room}-${hash}` : `brand-${hash}`;
}

/**
 * Rebuild products.search_vector after a brand or category is renamed.
 *
 * The vector includes the brand and category NAMES, but its trigger fires on
 * product updates only — renaming "Xiomi" to "Xiaomi" left search finding the
 * old spelling and missing the new one. Setting the id column to itself fires
 * `UPDATE OF brand_id` / `category_id` without changing anything else.
 */
async function refreshProductSearch(
  db: AdminDb,
  column: "brand_id" | "category_id",
  id: string,
): Promise<void> {
  await db.from("products").update({ [column]: id }).eq(column, id);
}

export type QuickBrandResult =
  | { ok: true; brand: BrandLite; existed: boolean }
  | { ok: false; error: string };

/**
 * Add or rename a brand without leaving the product form.
 *
 * The product form's brand list looked hardcoded to the people using it: the
 * only way to a new maker was to abandon a half-filled product, find the
 * Brands page, and come back. This is the same write as saveBrand, callable
 * from a button inside the product form (which cannot nest a second <form>).
 *
 * Adding a name that already exists — "anker" when "Anker" is there — returns
 * the existing brand rather than a near-duplicate, so the storefront filter
 * does not end up listing the same maker twice.
 */
export async function quickSaveBrand(input: {
  id?: string;
  name: string;
}): Promise<QuickBrandResult> {
  await requirePermission("products");

  const name = cleanBrandName(String(input.name ?? ""));
  if (!brandKey(name)) return { ok: false, error: "Type the brand name." };
  if (name.length > 80) return { ok: false, error: "Keep the name under 80 characters." };

  const db = createAdminClient();
  const id = input.id ? String(input.id) : "";
  const all = await loadBrands(db);
  const twin = findBrandTwin(all, name, id);

  // ── Rename ────────────────────────────────────────────────────────────────
  if (id) {
    const current = all.find((b) => b.id === id);
    if (!current) return { ok: false, error: "That brand no longer exists." };
    if (twin) return { ok: false, error: `Another brand is already called “${twin.name}”.` };

    // The slug is left alone on purpose: it is in shared filter links, and a
    // spelling fix should not break them.
    const { data, error } = await db
      .from("brands")
      .update({ name })
      .eq("id", id)
      .select("id, name, slug")
      .single();
    if (error || !data) return { ok: false, error: "Could not rename that brand." };

    if (current.name !== name) await refreshProductSearch(db, "brand_id", id);

    revalidatePath("/admin/brands");
    revalidatePath("/", "layout");
    return { ok: true, brand: data as BrandLite, existed: false };
  }

  // ── Add ───────────────────────────────────────────────────────────────────
  if (twin) return { ok: true, brand: twin, existed: true };

  const slug = freeBrandSlug(all, name);
  const { data, error } = await db
    .from("brands")
    .insert({ name, slug, is_active: true })
    .select("id, name, slug")
    .single();

  if (error) {
    // Someone added the same brand a moment ago: the deterministic slug makes
    // the unique index catch it, and this request simply gets that row.
    if (error.code === "23505") {
      const { data: raced } = await db
        .from("brands")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();
      if (raced && brandKey(raced.name) === brandKey(name)) {
        return { ok: true, brand: raced as BrandLite, existed: true };
      }
    }
    return { ok: false, error: "Could not add that brand. Try again." };
  }

  revalidatePath("/admin/brands");
  revalidatePath("/", "layout");
  return { ok: true, brand: data as BrandLite, existed: false };
}

export async function deleteBrand(id: string): Promise<AdminState> {
  await requirePermission("products");
  const db = createAdminClient();

  // products.brand_id is ON DELETE SET NULL, so deleting would silently strip
  // the maker off every product that carries it. Refuse, the same way
  // categories do, and point at the non-destructive option.
  const { count } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `${count} products still use this brand. Reassign them first, or deactivate the brand instead.`,
    };
  }

  const { error } = await db.from("brands").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete that brand." };

  revalidatePath("/admin/brands");
  revalidatePath("/", "layout");
  return { ok: true, message: "Brand deleted." };
}
