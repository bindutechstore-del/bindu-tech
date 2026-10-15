"use client";

import { startTransition, useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signUp, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";

const initial: AuthState = { ok: false };

export function SignUpForm({ referralCode = "" }: { referralCode?: string }) {
  const [state, action, pending] = useActionState(signUp, initial);

  // Email confirmation is on for this project — there is no session yet.
  if (state.ok && state.message) {
    return (
      <div className="mt-6 rounded-lg border border-success/20 bg-success-soft p-4 text-center">
        <MailCheck className="mx-auto text-success" size={26} />
        <p className="mt-2 text-sm font-medium text-success">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      action={action}
      // No React 19 auto-reset: a rejected submit keeps what was typed.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="mt-6 space-y-4">
      {/* Carried from ?ref= on the invite link. Validated server-side by
          claim_referral, which ignores anything it does not recognise. */}
      {referralCode ? (
        <input type="hidden" name="ref" value={referralCode} />
      ) : null}

      <Field
        label="Full name"
        htmlFor="full_name"
        required
        error={state.fieldErrors?.full_name}
      >
        <Input
          id="full_name"
          name="full_name"
          required
          autoComplete="name"
          placeholder="Your name"
          invalid={Boolean(state.fieldErrors?.full_name)}
        />
      </Field>

      <Field label="Email" htmlFor="email" required error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <Field
        label="Mobile number"
        htmlFor="phone"
        hint="Optional, but it speeds up delivery"
        error={state.fieldErrors?.phone}
      >
        <Input
          id="phone"
          name="phone"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          invalid={Boolean(state.fieldErrors?.phone)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        hint="At least 8 characters"
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={pending}>
        Create account
      </Button>
    </form>
  );
}
