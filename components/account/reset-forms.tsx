"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";

const initial: AuthState = { ok: false };

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.ok) {
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
      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(state.error)}
        />
      </Field>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  const [ready, setReady] = useState<boolean | null>(null);

  // By the time this renders, /auth/callback has already exchanged the emailed
  // code for a session — the recovery link points there, not here. We still
  // wait for the client to see that session before offering the form, so a
  // genuinely expired link shows the explanation instead of a dead form.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (ready === false) {
    return (
      <p className="mt-6 rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
        This reset link has expired or has already been used. Request a new one from
        the forgot-password page.
      </p>
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
      <Field
        label="New password"
        htmlFor="password"
        required
        hint="At least 8 characters"
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(state.error)}
        />
      </Field>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={pending} disabled={ready === null}>
        {ready === null ? "Checking link…" : "Save new password"}
      </Button>
    </form>
  );
}
