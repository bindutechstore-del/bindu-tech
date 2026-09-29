"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Package, PackagePlus, X, CheckCircle2 } from "lucide-react";
import { submitProductRequest, type RequestState } from "@/lib/actions/requests";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/field";

/** Anything on the page can open the form with this event. */
export const OPEN_REQUEST_EVENT = "request-product:open";

export function openRequestProduct() {
  window.dispatchEvent(new Event(OPEN_REQUEST_EVENT));
}

/** A menu row / footer link that opens the Request a Product form. */
export function RequestProductButton({
  className,
  onClick,
}: {
  className?: string;
  /** e.g. close the menu drawer first. */
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        openRequestProduct();
      }}
      className={className}
    >
      <PackagePlus size={18} className="shrink-0" />
      Request a Product
    </button>
  );
}

const initial: RequestState = { ok: false };

/**
 * "Request a Product": tell the shop what you are looking for. Mounted once
 * in the storefront layout; opened by the menu row or the footer link.
 * Staff read the requests in admin → Product requests.
 */
export function RequestProductDialog({
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const [open, setOpen] = useState(false);
  // Remounting the form per opening clears the last request's answers.
  const [round, setRound] = useState(0);

  useEffect(() => {
    const onOpen = () => {
      setRound((r) => r + 1);
      setOpen(true);
    };
    window.addEventListener(OPEN_REQUEST_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_REQUEST_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/45"
        onClick={() => setOpen(false)}
        aria-label="Close"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-title"
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Package size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="request-title" className="text-lg font-bold tracking-tight text-ink">
              Request a Product
            </h2>
            <p className="text-sm text-ink-muted">Let us know what you&apos;re looking for</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-sunken"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <RequestForm
          key={round}
          defaultName={defaultName}
          defaultEmail={defaultEmail}
          defaultPhone={defaultPhone}
          onDone={() => setOpen(false)}
        />
      </div>
    </div>
  );
}

function RequestForm({
  defaultName,
  defaultEmail,
  defaultPhone,
  onDone,
}: {
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(submitProductRequest, initial);
  const errors = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <CheckCircle2 size={44} className="text-success" />
        <p className="text-base font-semibold text-ink">Request sent</p>
        <p className="max-w-sm text-sm text-ink-muted">{state.message}</p>
        <Button type="button" onClick={onDone} className="mt-2">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form
      action={action}
      // No React 19 auto-reset: a refused request keeps what was typed.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="space-y-4 overflow-y-auto px-5 py-5">
        {/* Honeypot for form-filling bots; hidden from people and screen readers. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <Field label="Your Name" htmlFor="rq-name" required error={errors.name}>
          <Input id="rq-name" name="name" required maxLength={80} defaultValue={defaultName} placeholder="Enter your name" />
        </Field>
        <Field label="Email" htmlFor="rq-email" required error={errors.email}>
          <Input id="rq-email" name="email" type="email" required maxLength={160} defaultValue={defaultEmail} placeholder="your@email.com" />
        </Field>
        <Field label="Phone (optional)" htmlFor="rq-phone" error={errors.phone}>
          <Input id="rq-phone" name="phone" type="tel" inputMode="tel" defaultValue={defaultPhone} placeholder="01XXXXXXXXX" />
        </Field>
        <Field label="Quantity" htmlFor="rq-qty" error={errors.quantity}>
          <Input id="rq-qty" name="quantity" type="number" min={1} max={1000} defaultValue={1} />
        </Field>
        <Field label="Product Name" htmlFor="rq-product" required error={errors.product_name}>
          <Input id="rq-product" name="product_name" required maxLength={160} placeholder="What product are you looking for?" />
        </Field>
        <Field label="Product Description (optional)" htmlFor="rq-desc" error={errors.description}>
          <Textarea
            id="rq-desc"
            name="description"
            rows={3}
            maxLength={1000}
            placeholder="Describe the product you want (brand, model, size, color, etc.)"
          />
        </Field>
        <Field label="Expected Price (optional)" htmlFor="rq-price" error={errors.expected_price}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
              ৳
            </span>
            <Input id="rq-price" name="expected_price" type="number" min={0} step="1" placeholder="0.00" className="pl-8" />
          </div>
        </Field>
      </div>

      <div className="border-t border-line px-5 py-4">
        {state.error ? (
          <p role="alert" className="mb-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" block loading={pending}>
          Send request
        </Button>
      </div>
    </form>
  );
}
