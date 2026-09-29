"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { addressSchema } from "@/lib/validations/checkout";
import { reviewSchema, newsletterSchema } from "@/lib/validations/catalog";

export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveAddress(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const row = { ...parsed.data, user_id: user.id };

  // The partial unique index allows exactly one default per user, so clear the
  // old one first rather than letting the insert fail.
  if (parsed.data.is_default) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { error } = id
    ? await supabase.from("addresses").update(row).eq("id", id).eq("user_id", user.id)
    : await supabase.from("addresses").insert(row);

  if (error) return { ok: false, error: "We could not save that address." };

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(id: string): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/account/addresses");
  return error ? { ok: false, error: "Could not delete that address." } : { ok: true };
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("full_name") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      marketing_opt_in: formData.get("marketing_opt_in") === "on",
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: "Could not save your profile." };

  revalidatePath("/account");
  return { ok: true, message: "Profile updated." };
}

/**
 * Save (or clear) the customer's profile picture.
 *
 * The file itself was uploaded by the browser into avatars/<their id>/…,
 * which storage RLS allows only for their own folder. This only records the
 * URL, and only a URL pointing inside that same folder — never someone
 * else's picture, never an outside link.
 */
export async function updateAvatar(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const raw = String(formData.get("avatar_url") ?? "").trim();

  // Parsed, not prefix-matched: a string check let "…/<me>/%2e%2e/<you>/…"
  // through, which a browser resolves to someone else's folder. The same
  // rule is a CHECK constraint on profiles (0026), since customers can also
  // update their row directly.
  let url: string | null = null;
  if (raw) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(raw);
    } catch {
      parsed = null;
    }
    const host = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : "";
    const path = new RegExp(
      `^/storage/v1/object/public/avatars/${user.id}/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\\.(webp|jpe?g|png)$`,
    );
    if (
      !parsed ||
      parsed.protocol !== "https:" ||
      parsed.host !== host ||
      parsed.search ||
      parsed.hash ||
      raw.includes("%") ||
      !path.test(parsed.pathname)
    ) {
      return { ok: false, error: "Upload the picture here, then save." };
    }
    url = parsed.href;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Could not save your picture." };

  // Remove every other file in their folder: a picture that was replaced or
  // removed should not stay online, and each one costs free-tier storage.
  // Best effort — the profile is already saved.
  const keep = url ? url.split("/storage/v1/object/public/avatars/")[1] : null;
  const { data: sessions } = await supabase.storage.from("avatars").list(user.id, { limit: 50 });
  const stale: string[] = [];
  for (const folder of sessions ?? []) {
    const { data: files } = await supabase.storage
      .from("avatars")
      .list(`${user.id}/${folder.name}`, { limit: 50 });
    for (const f of files ?? []) {
      const path = `${user.id}/${folder.name}/${f.name}`;
      if (path !== keep) stale.push(path);
    }
  }
  if (stale.length > 0) await supabase.storage.from("avatars").remove(stale);

  // The menu drawer greets them with it on every page.
  revalidatePath("/", "layout");
  return { ok: true, message: url ? "Picture saved." : "Picture removed." };
}

/** Wishlist toggle. Returns the new state so the heart can flip optimistically. */
export async function toggleWishlist(productId: string): Promise<{
  ok: boolean;
  wishlisted?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sign in to save items to your wishlist." };

  const { data, error } = await supabase.rpc("toggle_wishlist", {
    p_product_id: productId,
  });

  if (error) return { ok: false, error: "Could not update your wishlist." };

  revalidatePath("/account/wishlist");
  return { ok: true, wishlisted: data as boolean };
}

export async function cancelOrder(orderId: string, reason?: string): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_my_order", {
    p_order_id: orderId,
    p_reason: reason ?? null,
  });

  if (error) {
    if (error.message.includes("too_late_to_cancel")) {
      return {
        ok: false,
        error: "This order has already been dispatched. Contact support to arrange a return.",
      };
    }
    return { ok: false, error: "Could not cancel that order." };
  }

  revalidatePath("/account/orders");
  return { ok: true, message: "Order cancelled. Any reserved stock has been released." };
}

/**
 * Submit a review.
 *
 * The RLS policy on `reviews` independently requires a delivered order for this
 * product, so a forged product_id cannot plant a review.
 */
export async function submitReview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Please check your review.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("reviews").insert({
    product_id: parsed.data.product_id,
    user_id: user!.id,
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    body: parsed.data.body,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You have already reviewed this product." };
    }
    return {
      ok: false,
      error: "You can review a product once it has been delivered to you.",
    };
  }

  return { ok: true, message: "Thanks — your review is awaiting moderation." };
}

export async function subscribeNewsletter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = newsletterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email: parsed.data.email, source: parsed.data.source ?? "footer" });

  // A duplicate means they are already on the list — not an error worth showing.
  if (error && error.code !== "23505") {
    return { ok: false, error: "Could not sign you up. Please try again." };
  }

  return { ok: true, message: "You are on the list." };
}
