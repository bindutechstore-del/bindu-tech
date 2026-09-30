"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateCartId } from "@/lib/cart/session";
import { checkoutSchema } from "@/lib/validations/checkout";
import { getProvider } from "@/lib/payments";
import { siteUrl } from "@/lib/utils/site-url";

/**
 * Order placement.
 *
 * Read the fields this action forwards to `place_order()`: a cart id, contact
 * details, an address and a payment method. There is no amount, no subtotal, no
 * discount and no total, because the database recomputes all four from live
 * catalog rows. If you are ever tempted to add one, re-read CLAUDE.md rule 1.
 */

export interface CheckoutState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function placeOrderError(message: string): string {
  if (message.includes("cart_empty")) return "Your cart is empty.";
  if (message.includes("stock_changed"))
    return "Something in your cart just went out of stock. Please review it and try again.";
  if (message.includes("delivery_unavailable"))
    return "We cannot deliver to that district yet.";
  if (message.includes("invalid_phone"))
    return "That mobile number does not look right.";
  if (message.includes("cart_forbidden") || message.includes("cart_not_found"))
    return "Your cart session expired. Please add your items again.";
  return "We could not place your order. Please try again.";
}

/**
 * Bangladesh's bounding box. A pin outside it is a bad fix — a VPN, or a
 * desktop locating itself off a foreign network — not somewhere we deliver.
 */
function withinDelivery(
  lat: number | undefined,
  lng: number | undefined,
): { lat: number | null; lng: number | null } {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    lat < 20.3 ||
    lat > 26.7 ||
    lng < 88.0 ||
    lng > 92.7
  ) {
    return { lat: null, lng: null };
  }
  return { lat, lng };
}

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const input = parsed.data;

  // A method that is not enabled (or has no credentials) can never be used,
  // even if the form was tampered with.
  const provider = getProvider(input.payment_method);
  if (!provider) {
    return { ok: false, error: "That payment method is not available right now." };
  }

  const pin = withinDelivery(input.lat, input.lng);

  const supabase = await createClient();
  const { cartId, guestToken } = await getOrCreateCartId();

  const { data, error } = await supabase.rpc("place_order", {
    p_cart_id: cartId,
    p_customer_name: input.customer_name,
    p_customer_phone: input.customer_phone,
    p_customer_email: input.customer_email || null,
    p_district: input.district,
    p_area: input.area,
    p_street: input.street,
    p_postcode: input.postcode || null,
    p_landmark: input.landmark || null,
    p_payment_method: input.payment_method,
    p_customer_note: input.customer_note || null,
    p_address_id: input.address_id || null,
    p_guest_token: guestToken,
    p_save_address: input.save_address ?? false,
    // A boolean intent, not an amount. What the advance actually comes to is
    // decided by place_order from the settings rule — the client never names
    // a figure it would like to pay.
    p_partial_payment: input.partial_payment === "on",
    p_use_credit: input.use_credit === "on",
    p_use_credit_account: input.use_credit_account === "on",
    p_redeem_points: input.redeem_points === "on",
    // Null rather than undefined: the RPC needs the argument present so the
    // one signature resolves, and null is what "no pin" means in the column.
    //
    // Re-checked here as well as in the picker, because a form post can carry
    // anything. A pin outside Bangladesh is dropped rather than rejected: the
    // written address is what the courier uses, so a bad coordinate should
    // not cost the customer their order.
    p_lat: pin.lat,
    p_lng: pin.lng,
    p_place_label: pin.lat === null ? null : input.place_label || null,
  });

  if (error) {
    return { ok: false, error: placeOrderError(error.message) };
  }

  const order = data as {
    order_id: string;
    order_number: string;
    total_paisa: number;
    advance_paisa: number;
    credit_applied_paisa: number;
    credit_account_paisa: number;
    points_redeemed_paisa: number;
    points_spent: number;
    due_on_delivery_paisa: number;
    payment_method: string;
  };

  revalidatePath("/cart");

  // COD is done: the order exists and is actionable by the warehouse.
  if (input.payment_method === "cod") {
    redirect(`/order/confirmed?ref=${encodeURIComponent(order.order_number)}`);
  }

  // Online methods need a gateway session. The amount comes from the order row
  // we just created, never from the form.
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, amount_paisa")
    .eq("order_id", order.order_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    redirect(`/order/confirmed?ref=${encodeURIComponent(order.order_number)}`);
  }

  const site = siteUrl();
  const secret = process.env.PAYMENT_CALLBACK_SECRET ?? "";
  const callbackUrl =
    `${site}/api/payments/${input.payment_method}/callback` +
    `?payment=${payment.id}&sig=${await signCallback(payment.id, secret)}`;

  const result = await provider.initiate({
    orderId: order.order_id,
    orderNumber: order.order_number,
    amountPaisa: payment.amount_paisa,
    customerName: input.customer_name,
    customerPhone: input.customer_phone,
    customerEmail: input.customer_email || null,
    callbackUrl,
  });

  if (result.kind === "error") {
    return {
      ok: false,
      error: `${result.message} Your order ${order.order_number} is saved — you can retry payment from your orders page.`,
    };
  }

  if (result.kind === "redirect") {
    await admin
      .from("payments")
      .update({ provider_ref: result.providerRef, status: "pending" })
      .eq("id", payment.id);
    redirect(result.url);
  }

  // Manual wallet transfer: send the customer to submit their transaction id
  // and proof. The row is marked as a manual submission when they do — see
  // lib/payments/manual.ts. Nothing here marks the order paid; only a staff
  // decision can.
  if (result.kind === "manual") {
    await admin
      .from("payments")
      .update({ status: "initiated" })
      .eq("id", payment.id);
    redirect(result.submitPath);
  }

  redirect(`/order/confirmed?ref=${encodeURIComponent(order.order_number)}`);
}

/**
 * HMAC over the payment id so a gateway return URL cannot be pointed at a
 * different payment by editing the query string.
 */
export async function signCallback(paymentId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(paymentId));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
