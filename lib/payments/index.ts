import "server-only";

import type { PaymentMethod } from "@/types/database";
import type { PaymentProvider } from "./types";
import { codProvider } from "./cod";
import { bkashProvider } from "./bkash";
import { nagadProvider } from "./nagad";
import { cardProvider } from "./card";
import { bkashManualProvider, nagadManualProvider } from "./manual";

export type { PaymentProvider, PaymentInitInput, PaymentInitResult } from "./types";

/**
 * Provider resolution.
 *
 * bKash and Nagad each have two implementations: the automated gateway, and
 * manual verification where the customer transfers the money themselves and
 * submits proof. We prefer the gateway when its credentials are present and
 * fall back to manual otherwise.
 *
 * The customer sees one "bKash" option either way. Keeping the choice here is
 * what stops a `if (manual)` branch leaking into checkout — CLAUDE.md rule 5.
 */
const ALL_PROVIDERS: Record<string, PaymentProvider> = {
  cod: codProvider,
  bkash: bkashProvider.isConfigured() ? bkashProvider : bkashManualProvider,
  nagad: nagadProvider.isConfigured() ? nagadProvider : nagadManualProvider,
  card: cardProvider,
};

/** True when this method will go through manual staff verification. */
export function isManualFlow(id: PaymentMethod): boolean {
  return (
    (id === "bkash" && !bkashProvider.isConfigured()) ||
    (id === "nagad" && !nagadProvider.isConfigured())
  );
}

/**
 * Providers the operator has switched on, intersected with the ones that
 * actually have credentials.
 *
 * Two gates on purpose. `PAYMENTS_ENABLED_PROVIDERS` is the business decision
 * ("we are live on bKash"); `isConfigured()` is the technical reality ("the
 * keys are present"). A provider missing either is hidden, never shown broken.
 */
/**
 * The method ids PAYMENTS_ENABLED_PROVIDERS switches on.
 *
 * A value naming no method we know is a broken setting, not a decision to
 * stop trading: after the October 2026 move between Vercel projects the
 * variable held an encrypted blob, checkout offered no payment method at all
 * and every order failed with "Please check the highlighted fields". So an
 * unreadable value falls back to cash on delivery — which needs no
 * credentials — and says so in the logs.
 */
function allowedIds(): string[] {
  const raw = process.env.PAYMENTS_ENABLED_PROVIDERS ?? "cod";
  const ids = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const known = ids.filter((id) => id in ALL_PROVIDERS);
  if (known.length === 0) {
    console.error(
      `PAYMENTS_ENABLED_PROVIDERS names no known method (${raw.slice(0, 40)}…); falling back to cod`,
    );
    return ["cod"];
  }
  return known;
}

export function enabledProviders(): PaymentProvider[] {
  return allowedIds()
    .map((id) => ALL_PROVIDERS[id])
    .filter((p): p is PaymentProvider => Boolean(p) && p.isConfigured());
}

export function getProvider(id: PaymentMethod): PaymentProvider | null {
  const provider = ALL_PROVIDERS[id];
  if (!provider || !provider.isConfigured()) return null;
  return allowedIds().includes(id) ? provider : null;
}

/**
 * Serialisable shape for the checkout client component. The provider objects
 * themselves hold closures over secrets and must not cross the boundary.
 */
export interface PaymentOption {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: string;
}

export function paymentOptions(): PaymentOption[] {
  return enabledProviders().map(({ id, label, description, icon }) => ({
    id,
    label,
    description,
    icon,
  }));
}
