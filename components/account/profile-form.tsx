"use client";

import { startTransition, useActionState } from "react";
import { updateProfile, type ActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";

const initial: ActionState = { ok: false };

export function ProfileForm({
  fullName,
  phone,
  email,
  marketingOptIn,
}: {
  fullName: string;
  phone: string;
  email: string;
  marketingOptIn: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);

  return (
    <Card className="p-5">
      <form
        action={action}
        // No React 19 auto-reset: a rejected submit keeps what was typed.
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" name="full_name" defaultValue={fullName} />
          </Field>

          <Field label="Mobile number" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              inputMode="numeric"
              defaultValue={phone}
              placeholder="01XXXXXXXXX"
            />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            hint="Contact support to change your email"
            className="sm:col-span-2"
          >
            <Input id="email" value={email} disabled readOnly />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="marketing_opt_in"
            defaultChecked={marketingOptIn}
            className="size-4 accent-brand-600"
          />
          Email me about offers and restocks
        </label>

        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state.ok && state.message ? (
          <p className="text-sm font-medium text-success">{state.message}</p>
        ) : null}

        <Button type="submit" loading={pending}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}
