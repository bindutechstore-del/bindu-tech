"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { subscribeNewsletter, type ActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const initial: ActionState = { ok: false };

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);

  if (state.ok) {
    return (
      <p className="rounded-lg border border-success/20 bg-success-soft px-4 py-2.5 text-sm font-medium text-success">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="w-full max-w-md">
      <div className="flex gap-2">
        <Input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          invalid={Boolean(state.error)}
        />
        <input type="hidden" name="source" value="footer" />
        {/* The word is hidden on phones, so the button names itself. */}
        <Button type="submit" loading={pending} aria-label="Subscribe">
          <Send />
          <span className="hidden sm:inline">Subscribe</span>
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
