"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { bdPhone } from "@/lib/validations/checkout";
import { takaToPaisa } from "@/lib/utils/money";

export interface RequestState {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const requestSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(160),
  phone: bdPhone.optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "At least 1").max(1000),
  product_name: z.string().trim().min(2, "What product are you looking for?").max(160),
  description: z.string().trim().max(1000, "Keep it under 1,000 characters").optional().or(z.literal("")),
  expected_price: z
    .union([z.literal(""), z.coerce.number().min(0).max(1_000_000)])
    .optional(),
});

/** Most requests one email or phone may send in 24 hours. */
const DAILY_LIMIT = 5;

/**
 * "Request a Product" from the menu.
 *
 * Validated here, then written with the service role: the table has no
 * public insert policy (0028), so this is the only way in. A hidden
 * "website" field catches form-filling bots, and one email or phone can send
 * at most DAILY_LIMIT requests a day.
 */
export async function submitProductRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  // Honeypot: people never see or fill it. Pretend success to bots.
  if (String(formData.get("website") ?? "").trim()) {
    return { ok: true, message: "Thanks — we have your request." };
  }

  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();
  const phone = d.phone || null;

  const db = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("product_requests")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    // Quoted so nothing in an address can be read as filter syntax.
    .or(phone ? `email.eq."${email}",phone.eq."${phone}"` : `email.eq."${email}"`);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return {
      ok: false,
      error: "You have sent several requests today — we will get back to you on those first.",
    };
  }

  const user = await getSessionUser();
  const { error } = await db.from("product_requests").insert({
    user_id: user?.id ?? null,
    name: d.name,
    email,
    phone,
    quantity: d.quantity,
    product_name: d.product_name,
    description: d.description || null,
    expected_price_paisa:
      d.expected_price === "" || d.expected_price == null ? null : takaToPaisa(d.expected_price),
  });
  if (error) return { ok: false, error: "Could not send your request. Please try again." };

  revalidatePath("/admin/requests");
  return {
    ok: true,
    message: "Thanks! We have your request and will contact you if we can get it.",
  };
}

// ── Admin ───────────────────────────────────────────────────────────────────

const STATUSES = ["new", "contacted", "sourced", "closed"] as const;
export type RequestStatus = (typeof STATUSES)[number];

export async function setProductRequestStatus(
  id: string,
  status: RequestStatus,
): Promise<RequestState> {
  await requirePermission("products");
  if (!STATUSES.includes(status)) return { ok: false, error: "Unknown status." };
  const db = createAdminClient();
  const { error } = await db.from("product_requests").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Could not update the request." };
  revalidatePath("/admin/requests");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Updated." };
}

export async function deleteProductRequest(id: string): Promise<RequestState> {
  await requirePermission("products");
  const db = createAdminClient();
  const { error } = await db.from("product_requests").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the request." };
  revalidatePath("/admin/requests");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Deleted." };
}
