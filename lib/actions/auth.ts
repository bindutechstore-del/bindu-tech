"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readGuestToken, clearGuestToken } from "@/lib/cart/session";
import { bdPhone } from "@/lib/validations/checkout";
import { siteUrl } from "@/lib/utils/site-url";

export interface AuthState {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  phone: bdPhone.optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Passwords are limited to 72 characters"),
  /** From ?ref= on the sign-up link. Optional and never trusted. */
  ref: z.string().trim().max(12).optional().or(z.literal("")),
});

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Sign in, then fold the guest cart into the user's cart.
 *
 * The merge happens here rather than in a trigger because the guest token lives
 * in a cookie the database cannot see.
 */
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please check your details.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately vague: distinguishing "no such account" from "wrong
    // password" is an account-enumeration oracle.
    return { ok: false, error: "That email and password do not match." };
  }

  const guestToken = await readGuestToken();
  if (guestToken) {
    await supabase.rpc("merge_guest_cart", { p_guest_token: guestToken });
    await clearGuestToken();
  }

  // Collect anything a guest order earned against this number. The profile
  // trigger covers sign-up and phone edits, but not the common case of an
  // existing customer who checked out without signing in. Safe to call every
  // time: already-claimed rows are skipped.
  await supabase.rpc("claim_pending_points");

  revalidatePath("/", "layout");
  redirect(parsed.data.next || "/account");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please check your details.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the on_auth_user_created trigger to populate profiles.
      data: { full_name: parsed.data.full_name, phone: parsed.data.phone || null },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // No session means the project requires email confirmation.
  if (!data.session) {
    return {
      ok: true,
      message: "Check your inbox — we sent you a link to confirm your address.",
    };
  }

  // Attribute the referral now that there is a session to attribute it to.
  // claim_referral is deliberately quiet: an unknown, self-owned or
  // already-used code is not something to interrupt a new customer with.
  if (parsed.data.ref) {
    await supabase.rpc("claim_referral", { p_code: parsed.data.ref });
  }

  const guestToken = await readGuestToken();
  if (guestToken) {
    await supabase.rpc("merge_guest_cart", { p_guest_token: guestToken });
    await clearGuestToken();
  }

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!z.string().email().safeParse(email).success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  // Through /auth/callback, NOT straight to /reset-password.
  //
  // Supabase sends a PKCE link carrying `?code=…`, which has to be exchanged
  // for a session before the new password can be set. /reset-password does no
  // exchange, so pointing the email there left the visitor with no session and
  // the form told them — wrongly — that the link had expired. The callback
  // route exchanges the code and then forwards them on, exactly as the
  // sign-up confirmation link already did.
  const site = siteUrl();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/callback?next=/reset-password`,
  });

  // Always the same answer, whether or not the account exists.
  return {
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { ok: false, error: "Use at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };

  redirect("/account");
}
