"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCartId, getExistingCartId } from "@/lib/cart/session";
import { EMPTY_QUOTE, type CartQuote } from "@/lib/pricing/types";
import { paymentOptions } from "@/lib/payments";
import type { PaymentMethod } from "@/types/database";

/**
 * Cart mutations.
 *
 * Every one of these ends in a `quote_cart()` call and returns the fresh quote,
 * so the client never has to add anything up. The client sends ids and
 * quantities; the database sends back money.
 */

export interface CartActionResult {
  ok: boolean;
  quote: CartQuote;
  /** Set when the requested quantity was reduced to what is in stock. */
  notice?: string;
  error?: string;
}

/** Maps a Postgres error from the cart RPCs to copy a shopper can act on. */
function friendlyError(message: string): string {
  if (message.includes("out_of_stock")) return "That item just sold out.";
  if (message.includes("product_unavailable"))
    return "That product is no longer available.";
  if (message.includes("variant_unavailable"))
    return "That option is no longer available.";
  if (message.includes("variant_required")) return "Please choose a size or option first.";
  if (message.includes("cart_forbidden")) return "Your cart session expired.";
  if (message.includes("cart_not_found")) return "Your cart session expired.";
  if (message.includes("cart_item_not_found")) return "That item is no longer in your cart.";
  return "Something went wrong. Please try again.";
}

async function quote(
  cartId: string,
  district?: string | null,
  paymentMethod?: PaymentMethod | null,
): Promise<CartQuote> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quote_cart", {
    p_cart_id: cartId,
    p_district: district ?? null,
    p_coupon_code: null,
    // Delivery is cheaper on prepaid than on cash on delivery; the adjustment
    // is applied inside quote_cart from a settings row, never sent from here.
    p_payment_method: paymentMethod ?? null,
  });
  if (error || !data) return EMPTY_QUOTE;
  return data as CartQuote;
}

/** Read-only quote for rendering the cart page / header count. */
export async function getCartQuote(
  district?: string | null,
  paymentMethod?: PaymentMethod | null,
): Promise<CartQuote> {
  const { cartId } = await getExistingCartId();
  if (!cartId) return EMPTY_QUOTE;
  return quote(cartId, district, paymentMethod);
}

export async function addToCart(input: {
  productId: string;
  variantId?: string | null;
  quantity?: number;
}): Promise<CartActionResult> {
  const supabase = await createClient();
  const { cartId, guestToken } = await getOrCreateCartId();

  const { data, error } = await supabase.rpc("cart_add_item", {
    p_cart_id: cartId,
    p_product_id: input.productId,
    p_variant_id: input.variantId ?? null,
    p_quantity: input.quantity ?? 1,
    p_guest_token: guestToken,
  });

  if (error) {
    return { ok: false, quote: await quote(cartId), error: friendlyError(error.message) };
  }

  const result = data as { quantity: number; clamped: boolean };
  revalidatePath("/cart");

  return {
    ok: true,
    quote: await quote(cartId),
    notice: result?.clamped
      ? `Only ${result.quantity} left in stock — we added what we could.`
      : undefined,
  };
}

export async function setCartQuantity(
  cartItemId: string,
  quantity: number,
): Promise<CartActionResult> {
  const supabase = await createClient();
  const { cartId, guestToken } = await getOrCreateCartId();

  const { data, error } = await supabase.rpc("cart_set_quantity", {
    p_cart_id: cartId,
    p_cart_item_id: cartItemId,
    p_quantity: quantity,
    p_guest_token: guestToken,
  });

  if (error) {
    return { ok: false, quote: await quote(cartId), error: friendlyError(error.message) };
  }

  const result = data as { quantity?: number; clamped?: boolean; removed?: boolean };
  revalidatePath("/cart");

  return {
    ok: true,
    quote: await quote(cartId),
    notice: result?.clamped
      ? `Only ${result.quantity} left in stock.`
      : undefined,
  };
}

export async function removeCartItem(cartItemId: string): Promise<CartActionResult> {
  const supabase = await createClient();
  const { cartId, guestToken } = await getOrCreateCartId();

  const { error } = await supabase.rpc("cart_remove_item", {
    p_cart_id: cartId,
    p_cart_item_id: cartItemId,
    p_guest_token: guestToken,
  });

  revalidatePath("/cart");
  return error
    ? { ok: false, quote: await quote(cartId), error: friendlyError(error.message) }
    : { ok: true, quote: await quote(cartId) };
}

export async function clearCart(): Promise<CartActionResult> {
  const supabase = await createClient();
  const { cartId, guestToken } = await getOrCreateCartId();
  const { error } = await supabase.rpc("cart_clear", {
    p_cart_id: cartId,
    p_guest_token: guestToken,
  });
  revalidatePath("/cart");
  return error
    ? { ok: false, quote: await quote(cartId), error: friendlyError(error.message) }
    : { ok: true, quote: await quote(cartId) };
}

/**
 * Apply or clear a coupon.
 *
 * Validation lives entirely in `cart_apply_coupon()` → `quote_cart()`. The code
 * is only persisted onto the cart if it actually produced a discount, so a
 * stale invalid code cannot linger and silently change a later total.
 */
export async function applyCoupon(
  code: string,
  district?: string | null,
): Promise<CartActionResult> {
  const supabase = await createClient();
  const { cartId, guestToken } = await getOrCreateCartId();

  const { data, error } = await supabase.rpc("cart_apply_coupon", {
    p_cart_id: cartId,
    p_code: code,
    p_district: district ?? null,
    p_guest_token: guestToken,
  });

  if (error) {
    return { ok: false, quote: await quote(cartId, district), error: friendlyError(error.message) };
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true, quote: data as CartQuote };
}

/** Quote with a district applied — used by the checkout address step. */
export async function quoteForDistrict(
  district: string,
  paymentMethod?: PaymentMethod | null,
): Promise<CartQuote> {
  const { cartId } = await getExistingCartId();
  if (!cartId) return EMPTY_QUOTE;
  return quote(cartId, district, paymentMethod);
}

/**
 * One quote per payment method for the same district.
 *
 * The cart uses this to show what each method costs side by side, so the
 * choice between cash on delivery and bKash is made with the numbers visible
 * rather than discovered on the last step of checkout. Every figure comes back
 * from quote_cart — nothing here does arithmetic on money.
 */
export async function quoteByPaymentMethod(
  district: string,
): Promise<{ method: PaymentMethod; quote: CartQuote }[]> {
  const { cartId } = await getExistingCartId();
  if (!cartId) return [];

  const methods = paymentOptions().map((o) => o.id);
  const quotes = await Promise.all(
    methods.map(async (method) => ({ method, quote: await quote(cartId, district, method) })),
  );
  return quotes;
}
