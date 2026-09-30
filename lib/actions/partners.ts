"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { bdPhone } from "@/lib/validations/checkout";
import { PARTNER_TYPES } from "@/lib/validations/partner";
import { siteUrl } from "@/lib/utils/site-url";

export interface PartnerState {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const applicationSchema = z.object({
  store_name: z.string().trim().min(2, "Enter your store or company name").max(120),
  first_name: z.string().trim().min(1, "Enter your first name").max(60),
  last_name: z.string().trim().min(1, "Enter your last name").max(60),
  email: z.string().trim().email("Enter a valid email").max(160),
  phone: bdPhone.optional().or(z.literal("")),
  partner_type: z.enum(PARTNER_TYPES, { message: "Choose a partnership type" }),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().max(1000, "Keep it under 1,000 characters").optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Passwords are limited to 72 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "The passwords do not match",
    path: ["confirm_password"],
  });

/** Most applications one email may send in 24 hours. */
const DAILY_LIMIT = 3;

function fieldErrorsOf(error: z.ZodError, into: Record<string, string> = {}) {
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    into[key] ??= issue.message;
  }
  return into;
}

/**
 * "Become a partner" (/be-partner).
 *
 * A visitor without an account gets one at the same time — the password
 * fields create it through Supabase Auth, the same as the sign-up page. A
 * signed-in customer applies under their own account and sees no password
 * fields. Either way the application is written with the service role: the
 * table has no insert policy (0029), so this action is the only way in.
 */
export async function submitPartnerApplication(
  _prev: PartnerState,
  formData: FormData,
): Promise<PartnerState> {
  // Honeypot: people never see or fill it. Pretend success to bots.
  if (String(formData.get("website") ?? "").trim()) {
    return { ok: true, message: "Thanks — we have your application." };
  }

  const user = await getSessionUser();
  const fields = Object.fromEntries(formData);
  // A signed-in applicant applies as themselves, whatever the form says.
  if (user?.email) fields.email = user.email;

  const parsed = applicationSchema.safeParse(fields);
  const pw = user ? null : passwordSchema.safeParse(fields);
  if (!parsed.success || (pw && !pw.success)) {
    const fieldErrors: Record<string, string> = {};
    if (!parsed.success) fieldErrorsOf(parsed.error, fieldErrors);
    if (pw && !pw.success) fieldErrorsOf(pw.error, fieldErrors);
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();
  const phone = d.phone || null;

  const db = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("partner_applications")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .eq("email", email);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return {
      ok: false,
      error: "We already have your application — we will be in touch soon.",
    };
  }

  let userId = user?.id ?? null;
  let accountNote = "";

  if (user) {
    const { count: open } = await db
      .from("partner_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["new", "contacted", "approved"]);
    if ((open ?? 0) > 0) {
      return { ok: false, error: "You already have an application with us." };
    }
  } else if (pw?.success) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw.data.password,
      options: {
        // Read by the on_auth_user_created trigger to populate profiles.
        data: { full_name: `${d.first_name} ${d.last_name}`, phone },
        emailRedirectTo: `${siteUrl()}/auth/callback`,
      },
    });
    if (error) {
      // The application still counts — the account can be made later.
      accountNote = " We could not create your account just now; you can sign up any time.";
    } else if (data.user?.identities?.length) {
      userId = data.user.id;
      accountNote = data.session
        ? " Your account is ready and you are signed in."
        : " Check your inbox to confirm your email and finish creating your account.";
    } else {
      // Supabase answers a sign-up for an email that already has an account
      // with a stand-in user and no identities, so it cannot be used to probe
      // which addresses exist. Say nothing that would give that away.
      accountNote = " Check your inbox for a message from us.";
    }
  }

  const { error } = await db.from("partner_applications").insert({
    user_id: userId,
    store_name: d.store_name,
    first_name: d.first_name,
    last_name: d.last_name,
    email,
    phone,
    partner_type: d.partner_type,
    city: d.city || null,
    message: d.message || null,
  });
  if (error) return { ok: false, error: "Could not send your application. Please try again." };

  revalidatePath("/admin/partners");
  revalidatePath("/admin", "layout");
  revalidatePath("/be-partner");
  return {
    ok: true,
    message: `Thanks! We have your application and will contact you within two working days.${accountNote}`,
  };
}

// ── Admin ───────────────────────────────────────────────────────────────────

const STATUSES = ["new", "contacted", "approved", "rejected"] as const;
export type PartnerStatus = (typeof STATUSES)[number];

export async function setPartnerStatus(id: string, status: PartnerStatus): Promise<PartnerState> {
  await requirePermission("customers");
  if (!STATUSES.includes(status)) return { ok: false, error: "Unknown status." };
  const db = createAdminClient();
  const { error } = await db.from("partner_applications").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Could not update the application." };
  revalidatePath("/admin/partners");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Updated." };
}

export async function deletePartnerApplication(id: string): Promise<PartnerState> {
  await requirePermission("customers");
  const db = createAdminClient();
  const { error } = await db.from("partner_applications").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the application." };
  revalidatePath("/admin/partners");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Deleted." };
}
