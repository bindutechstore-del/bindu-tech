"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { submitPartnerApplication, type PartnerState } from "@/lib/actions/partners";
import { PARTNER_TYPES, PARTNER_TYPE_INFO } from "@/lib/validations/partner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

const initial: PartnerState = { ok: false };

/** Taller, rounder boxes than the shop's default inputs — a sign-up form. */
const BOX = "h-12 rounded-xl px-4 text-[15px]";

function Row({
  label,
  htmlFor,
  optional,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {optional ? <span className="ml-1 text-xs font-normal text-ink-faint">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PasswordInput({ id, name, placeholder, invalid }: { id: string; name: string; placeholder: string; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={shown ? "text" : "password"}
        required
        minLength={8}
        maxLength={72}
        autoComplete="new-password"
        placeholder={placeholder}
        invalid={invalid}
        className={cn(BOX, "pr-12")}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-faint hover:text-brand-600"
      >
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

/**
 * The "Become a partner" form. A signed-in customer applies under their
 * account (email fixed, no password); anyone else creates an account with
 * the same submit.
 */
export function PartnerForm({
  signedIn,
  defaultFirst = "",
  defaultLast = "",
  defaultEmail = "",
  defaultPhone = "",
}: {
  signedIn: boolean;
  defaultFirst?: string;
  defaultLast?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const [state, action, pending] = useActionState(submitPartnerApplication, initial);
  const errors = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="mt-6 rounded-xl border border-success/20 bg-success-soft p-5 text-center">
        <CheckCircle2 className="mx-auto text-success" size={30} />
        <p className="mt-2 text-[15px] font-semibold text-ink">Application received</p>
        <p className="mt-1 text-sm text-ink-soft">{state.message}</p>
        <Button asChild className="mt-4">
          <Link href="/">Back to shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      action={action}
      // No React 19 auto-reset: a refused application keeps what was typed.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="mt-6 space-y-5"
    >
      {/* Honeypot for form-filling bots; hidden from people and screen readers. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <Row label="Store / company name" htmlFor="pa-store" error={errors.store_name}>
        <Input id="pa-store" name="store_name" required maxLength={120} autoComplete="organization" placeholder="e.g. Rahim Electronics" invalid={Boolean(errors.store_name)} className={BOX} />
      </Row>

      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="First name" htmlFor="pa-first" error={errors.first_name}>
          <Input id="pa-first" name="first_name" required maxLength={60} autoComplete="given-name" placeholder="Rahim" defaultValue={defaultFirst} invalid={Boolean(errors.first_name)} className={BOX} />
        </Row>
        <Row label="Last name" htmlFor="pa-last" error={errors.last_name}>
          <Input id="pa-last" name="last_name" required maxLength={60} autoComplete="family-name" placeholder="Uddin" defaultValue={defaultLast} invalid={Boolean(errors.last_name)} className={BOX} />
        </Row>
      </div>

      <Row label="Email address" htmlFor="pa-email" error={errors.email}>
        <Input
          id="pa-email"
          name="email"
          type="email"
          required
          maxLength={160}
          autoComplete="email"
          placeholder="you@company.com"
          defaultValue={defaultEmail}
          // Signed in: the application goes under this account's email.
          readOnly={signedIn}
          invalid={Boolean(errors.email)}
          className={cn(BOX, signedIn && "bg-surface-sunken text-ink-muted")}
        />
      </Row>

      <Row label="Phone number" htmlFor="pa-phone" optional error={errors.phone}>
        <Input id="pa-phone" name="phone" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" defaultValue={defaultPhone} invalid={Boolean(errors.phone)} className={BOX} />
      </Row>

      {signedIn ? null : (
        <>
          <Row label="Password" htmlFor="pa-password" error={errors.password}>
            <PasswordInput id="pa-password" name="password" placeholder="At least 8 characters" invalid={Boolean(errors.password)} />
          </Row>
          <Row label="Confirm password" htmlFor="pa-confirm" error={errors.confirm_password}>
            <PasswordInput id="pa-confirm" name="confirm_password" placeholder="Re-enter your password" invalid={Boolean(errors.confirm_password)} />
          </Row>
        </>
      )}

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium text-ink">How do you want to partner?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PARTNER_TYPES.map((t) => (
            <label
              key={t}
              className="flex cursor-pointer gap-3 rounded-xl border border-line-strong p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
            >
              <input type="radio" name="partner_type" value={t} defaultChecked={t === "retail"} className="mt-0.5 size-4 shrink-0 accent-brand-600" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{PARTNER_TYPE_INFO[t].label}</span>
                <span className="block text-xs text-ink-muted">{PARTNER_TYPE_INFO[t].hint}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.partner_type ? (
          <p role="alert" className="text-xs text-danger">
            {errors.partner_type}
          </p>
        ) : null}
      </fieldset>

      <Row label="City / district" htmlFor="pa-city" optional error={errors.city}>
        <Input id="pa-city" name="city" maxLength={80} autoComplete="address-level2" placeholder="e.g. Dhaka" className={BOX} />
      </Row>

      <Row label="About your business" htmlFor="pa-message" optional error={errors.message}>
        <Textarea
          id="pa-message"
          name="message"
          maxLength={1000}
          rows={4}
          placeholder="What you sell, your Facebook page or website, roughly how many orders a month…"
          invalid={Boolean(errors.message)}
          className="rounded-xl px-4 py-3 text-[15px]"
        />
      </Row>

      {state.error ? (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={pending} className="rounded-xl">
        {signedIn ? "Submit application" : "Create account & apply"}
      </Button>

      {signedIn ? null : (
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/sign-in?next=/be-partner" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      )}
    </form>
  );
}
