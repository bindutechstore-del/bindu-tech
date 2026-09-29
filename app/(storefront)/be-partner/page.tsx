import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/queries/settings";
import { PARTNER_TYPE_INFO, type PartnerType } from "@/lib/validations/partner";
import { PartnerForm } from "@/components/storefront/partner-form";

export async function generateMetadata(): Promise<Metadata> {
  const { store_name } = await getStoreSettings();
  return {
    title: "Become a partner",
    alternates: { canonical: "/be-partner" },
    description: `Retail, corporate supply and affiliate partnerships with ${store_name}.`,
  };
}

const STATUS_TEXT: Record<string, string> = {
  new: "Received — we will contact you within two working days.",
  contacted: "In progress — we have been in touch with you.",
  approved: "Approved — welcome aboard!",
};

const when = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * "Become a partner" from the menu: a seller registration form. Applications
 * land in admin → Partners.
 */
export default async function BePartnerPage() {
  const user = await getSessionUser();

  // A signed-in applicant sees their open application instead of the form
  // again. Read with their own session: RLS lets them see only their rows.
  let open: { store_name: string; partner_type: PartnerType; status: string; created_at: string } | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("partner_applications")
      .select("store_name, partner_type, status, created_at")
      .eq("user_id", user.id)
      .in("status", ["new", "contacted", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    open = data;
  }

  const [first = "", ...rest] = (user?.profile?.full_name ?? "").trim().split(/\s+/);

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand-700">
        <ArrowLeft size={16} />
        Back to shopping
      </Link>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
          Seller registration
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Become a partner</h1>

        {open ? (
          <div className="mt-6 rounded-xl border border-success/20 bg-success-soft p-5">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 size={20} className="shrink-0 text-success" />
              We have your application
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              <span className="font-medium text-ink">{open.store_name}</span> ·{" "}
              {PARTNER_TYPE_INFO[open.partner_type]?.label ?? open.partner_type} · sent{" "}
              {when.format(new Date(open.created_at))}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{STATUS_TEXT[open.status]}</p>
          </div>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-ink-muted">
              Tell us a little about you and your business. Let&apos;s get your store set up.
            </p>
            <PartnerForm
              signedIn={Boolean(user)}
              defaultFirst={first}
              defaultLast={rest.join(" ")}
              defaultEmail={user?.email ?? ""}
              defaultPhone={user?.profile?.phone ?? ""}
            />
          </>
        )}
      </div>
    </div>
  );
}
