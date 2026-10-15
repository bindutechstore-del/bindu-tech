"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Truck, Tag, ShieldCheck, Info, X, Layers, Wallet, Clock, Sparkles, type LucideIcon } from "lucide-react";
import type { Address } from "@/types/database";
import type { CartQuote } from "@/lib/pricing/types";
import type { PaymentOption } from "@/lib/payments";
import { placeOrder, type CheckoutState } from "@/lib/actions/checkout";
import { quoteForDistrict } from "@/lib/actions/cart";
import { BD_DISTRICTS } from "@/lib/utils/districts";
import { formatTaka } from "@/lib/utils/money";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import {
  etaLabel,
  styleFor,
  type DeliveryOption,
} from "@/components/checkout/delivery-options";
import { applyCoupon } from "@/lib/actions/cart";
import { CreditAccountOption } from "./credit-account";
import { LocationPicker, type PickedLocation } from "./location-picker";

const initial: CheckoutState = { ok: false };

/**
 * Checkout.
 *
 * The form posts ids, names and an address. It does NOT post a price — read the
 * hidden inputs: there are none for money. `place_order()` re-quotes the cart
 * server-side and writes its own subtotal, discount, delivery fee and total.
 *
 * The figures rendered on the right are a live `quote_cart()` result refreshed
 * whenever the district changes, so the customer sees the real delivery charge
 * before committing — but that quote is display, not input.
 */
export function CheckoutForm({
  initialQuote,
  addresses,
  paymentOptions,
  signedIn,
  defaultName,
  defaultPhone,
  defaultEmail,
  codAdvanceThresholdPaisa,
  deliveryOptions,
  showroomAddress,
  advance,
  creditPaisa,
  paymentWindowMinutes,
  points,
}: {
  initialQuote: CartQuote;
  addresses: Address[];
  paymentOptions: PaymentOption[];
  signedIn: boolean;
  defaultName: string;
  defaultPhone: string;
  defaultEmail: string;
  codAdvanceThresholdPaisa: number;
  deliveryOptions: DeliveryOption[];
  /** Used as the address of record when the customer collects in person. */
  showroomAddress: string;
  /** The advance rule, so the figure can be shown before the order is placed. */
  advance: { enabled: boolean; percent: number; minPaisa: number };
  /** Minutes a prepaid order may sit unpaid before it is cancelled. */
  paymentWindowMinutes: number;
  /** The customer's points standing. Null for guests. */
  points: {
    balance: number;
    paisaPerPoint: number;
    minRedeemPoints: number;
    enabled: boolean;
  } | null;
  /** Spendable store credit. Zero for guests and for anyone with none. */
  creditPaisa: number;
}) {
  const [state, action, pending] = useActionState(placeOrder, initial);

  const preset = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
  const [addressId, setAddressId] = useState<string>(preset?.id ?? "");
  /*
   * The 64-district dropdown is gone. Delivery is three options, and the only
   * one that still needs a place name typed is Outside Dhaka — the other two
   * are fully determined by the choice itself.
   */
  const [zoneSlug, setZoneSlug] = useState<string>(
    preset?.district === "Dhaka" ? "inside-dhaka" : deliveryOptions[0]?.slug ?? "",
  );
  const [outsideCity, setOutsideCity] = useState(
    preset && preset.district !== "Dhaka" ? preset.district : "",
  );

  // What actually goes to the server as `district`, and what the zone
  // resolver matches on.
  const district =
    zoneSlug === "office-pickup"
      ? "Office Pickup"
      : zoneSlug === "inside-dhaka"
        ? "Dhaka"
        : outsideCity.trim();

  const isPickup = zoneSlug === "office-pickup";
  const chosenZone = deliveryOptions.find((o) => o.slug === zoneSlug) ?? null;

  const [quote, setQuote] = useState(initialQuote);
  const [method, setMethod] = useState<string>(paymentOptions[0]?.id ?? "cod");
  const [plan, setPlan] = useState<"full" | "partial">("full");
  const [useCredit, setUseCredit] = useState(creditPaisa > 0);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);

  /*
   * A picked pin, and the fields it filled. Held here rather than inside the
   * picker so choosing a location can also set the delivery zone and the
   * address inputs — and so the customer can then edit any of it.
   */
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [areaValue, setAreaValue] = useState("");
  const [streetValue, setStreetValue] = useState("");

  const applyLocation = (next: PickedLocation | null) => {
    setPicked(next);
    if (!next) return;

    if (next.area) setAreaValue(next.area);
    if (next.street) setStreetValue(next.street);

    // A pin in Dhaka means Inside Dhaka; anywhere else is Outside, with the
    // city filled in from the lookup. This is what removes the manual city
    // choice — the customer only intervenes if the guess is wrong.
    const city = (next.city || "").toLowerCase();
    if (city.includes("dhaka")) {
      setZoneSlug("inside-dhaka");
    } else if (next.city) {
      setZoneSlug("outside-dhaka");
      setOutsideCity(next.city);
    }
  };
  const [couponCode, setCouponCode] = useState("");
  const [couponPending, startCoupon] = useTransition();

  const submitCheckoutCoupon = (code: string) =>
    startCoupon(async () => {
      const result = await applyCoupon(code, district || null);
      if (result.quote.cart_id) setQuote(result.quote);
    });

  /*
   * Display only. place_order recomputes this from the settings rule and
   * ignores anything the client thought it should be — this exists so the
   * customer can see the number before committing, not to decide it.
   */
  const advanceNowPaisa = Math.min(
    quote.total_paisa,
    Math.max(
      advance.minPaisa,
      Math.round((quote.subtotal_paisa * advance.percent) / 100) +
        quote.delivery_fee_paisa,
    ),
  );
  const [, startQuote] = useTransition();

  // Re-quote whenever the district changes so the delivery fee is real.
  useEffect(() => {
    if (!district) return;
    startQuote(async () => {
      // The payment method is included because delivery is discounted on
      // prepaid; quoting without it would show a cash-on-delivery fee to
      // someone who has already chosen bKash.
      const next = await quoteForDistrict(district, method as never);
      if (next.cart_id) setQuote(next);
    });
  }, [district, method]);

  // The page arrives with a quote made before any delivery option was known,
  // so its delivery fee is 0. With Office Pickup gone, the default option is
  // a paid one, and showing that 0 as "Free" (and a total without delivery)
  // until the re-quote lands would flash a promise the order does not keep.
  const awaitingDeliveryQuote = Boolean(district) && !quote.delivery_zone;

  const usingSaved = Boolean(addressId);
  const saved = addresses.find((a) => a.id === addressId) ?? null;
  const codBlocked =
    method === "cod" && quote.total_paisa > codAdvanceThresholdPaisa;

  return (
    <form action={action} className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {addresses.length > 0 ? (
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-base font-semibold text-ink">Deliver to</h2>
            <div className="mt-3 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                    addressId === a.id
                      ? "border-brand-600 bg-brand-50"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="address_choice"
                    checked={addressId === a.id}
                    onChange={() => {
                      setAddressId(a.id);
                      // A saved address is either Dhaka or it is not; there is
                      // no third case now that pricing has three options.
                      if (a.district === "Dhaka") {
                        setZoneSlug("inside-dhaka");
                      } else {
                        setZoneSlug("outside-dhaka");
                        setOutsideCity(a.district);
                      }
                    }}
                    className="mt-1 accent-brand-600"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-ink">
                      {a.recipient_name} · {a.phone}
                    </span>
                    <span className="mt-0.5 block text-ink-muted">
                      {a.street}, {a.area}, {a.district}
                      {a.postcode ? ` ${a.postcode}` : ""}
                    </span>
                  </span>
                </label>
              ))}

              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                  !addressId ? "border-brand-600 bg-brand-50" : "border-line",
                )}
              >
                <input
                  type="radio"
                  name="address_choice"
                  checked={!addressId}
                  onChange={() => {
                    setAddressId("");
                  }}
                  className="mt-1 accent-brand-600"
                />
                <span className="text-sm font-medium text-ink">
                  Use a different address
                </span>
              </label>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">
            {usingSaved ? "Contact details" : "Delivery details"}
          </h2>

          {/* Saved address: the values still post, but as read-only fields. */}
          <input type="hidden" name="address_id" value={addressId} />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              htmlFor="customer_name"
              required
              error={state.fieldErrors?.customer_name}
            >
              <Input
                id="customer_name"
                name="customer_name"
                required
                autoComplete="name"
                defaultValue={saved?.recipient_name ?? defaultName}
                key={`name-${addressId}`}
                placeholder="Recipient's full name"
                invalid={Boolean(state.fieldErrors?.customer_name)}
              />
            </Field>

            <Field
              label="Mobile number"
              htmlFor="customer_phone"
              required
              hint="We send delivery updates to this number"
              error={state.fieldErrors?.customer_phone}
            >
              <Input
                id="customer_phone"
                name="customer_phone"
                required
                inputMode="numeric"
                autoComplete="tel"
                defaultValue={saved?.phone ?? defaultPhone}
                key={`phone-${addressId}`}
                placeholder="01XXXXXXXXX"
                invalid={Boolean(state.fieldErrors?.customer_phone)}
              />
            </Field>

            <Field
              label="Email"
              htmlFor="customer_email"
              hint="Optional — for your invoice"
              error={state.fieldErrors?.customer_email}
              className="sm:col-span-2"
            >
              <Input
                id="customer_email"
                name="customer_email"
                type="email"
                autoComplete="email"
                defaultValue={defaultEmail}
                placeholder="you@example.com"
              />
            </Field>

            {/*
              A collection needs no delivery address, and leaving four required
              address fields on screen next to "no delivery address needed"
              would be a contradiction the customer has to resolve. The server
              schema still requires area and street, so the showroom is
              submitted as the address of record — which is also the truthful
              answer to "where did this order go".
            */}
            {isPickup ? (
              <>
                <input type="hidden" name="area" value="Office Pickup" />
                <input type="hidden" name="street" value={showroomAddress} />
              </>
            ) : (
              <>
            <Field
              label="Area / thana"
              htmlFor="area"
              required
              error={state.fieldErrors?.area}
            >
              <Input
                id="area"
                name="area"
                required
                value={areaValue}
                onChange={(e) => setAreaValue(e.target.value)}
                placeholder="e.g. Dhanmondi"
                invalid={Boolean(state.fieldErrors?.area)}
              />
            </Field>

            <Field
              label="House & road"
              htmlFor="street"
              required
              className="sm:col-span-2"
              error={state.fieldErrors?.street}
            >
              <Input
                id="street"
                name="street"
                required
                value={streetValue}
                onChange={(e) => setStreetValue(e.target.value)}
                placeholder="House 12, Road 5, Block C"
                invalid={Boolean(state.fieldErrors?.street)}
              />
            </Field>

            <Field label="Postcode" htmlFor="postcode">
              <Input
                id="postcode"
                name="postcode"
                defaultValue={saved?.postcode ?? ""}
                key={`post-${addressId}`}
                placeholder="1205"
              />
            </Field>

            <Field label="Landmark" htmlFor="landmark" hint="Helps the courier find you">
              <Input
                id="landmark"
                name="landmark"
                defaultValue={saved?.landmark ?? ""}
                key={`land-${addressId}`}
                placeholder="Beside the mosque"
              />
            </Field>
              </>
            )}

            <Field
              label="Order note"
              htmlFor="customer_note"
              className="sm:col-span-2"
              hint="Anything the packer or courier should know"
            >
              <Textarea
                id="customer_note"
                name="customer_note"
                rows={2}
                maxLength={500}
                placeholder="Call before delivery, please."
              />
            </Field>
          </div>

          {signedIn && !usingSaved ? (
            <label className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="save_address"
                className="size-4 accent-brand-600"
              />
              Save this address for next time
            </label>
          ) : null}
        </section>

        {/*
          Its own box, directly above payment, rather than a field in the
          middle of the address form: how the order travels and how it is paid
          for are one decision made together, and the delivery choice also
          governs whether an address is needed at all.
        */}
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">Select Delivery Area</h2>

          {/*
            Full-width rows rather than three across: the radio, the icon, the
            name and the charge all sit on one line, so the eye compares three
            prices down a single column instead of across three cards.
          */}
          <div className="mt-3 space-y-2">
            {deliveryOptions.map((o) => {
              const st = styleFor(o.slug);
              const Icon = st.icon;
              const active = zoneSlug === o.slug;

              return (
                <button
                  key={o.slug}
                  type="button"
                  onClick={() => setZoneSlug(o.slug)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-brand-600 bg-brand-50/50"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  {/* A real radio would be easier, but the whole row has to be
                      the target — a 16px circle is not a touch target. */}
                  <span
                    className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      active ? "border-brand-600" : "border-line-strong"
                    }`}
                    aria-hidden
                  >
                    {active ? (
                      <span className="size-2.5 rounded-full bg-brand-600" />
                    ) : null}
                  </span>

                  <Icon size={20} className={`shrink-0 ${st.text}`} />

                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-5 text-ink">
                      {o.name}
                    </span>
                    <span
                      className={`block text-sm tabular ${
                        o.feePaisa === 0 ? "text-success" : "text-ink-muted"
                      }`}
                    >
                      {o.feePaisa === 0 ? "Free" : formatTaka(o.feePaisa)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* A one-line restatement of what was just chosen. It is the last
              thing between here and payment, so the charge and the timeframe
              are spelled out rather than left implied by the row above. */}
          {chosenZone ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-brand-600/15 bg-brand-50/60 px-4 py-2.5 text-xs text-brand-700">
              <Info size={14} className="shrink-0" />
              <span>
                Selected: <strong className="font-semibold">{chosenZone.name}</strong>
              </span>
              <span className="text-brand-700/40">•</span>
              <span>
                Charge:{" "}
                <strong className="font-semibold tabular">
                  {chosenZone.feePaisa === 0
                    ? "Free"
                    : formatTaka(chosenZone.feePaisa)}
                </strong>
              </span>
              <span className="text-brand-700/40">•</span>
              <span>
                Time: <strong className="font-semibold">{etaLabel(chosenZone)}</strong>
              </span>
            </div>
          ) : null}

          {/* The server still receives a district; the choice above just
              decides what it is, instead of making the customer find
              their own in a list of 64. */}
          <input type="hidden" name="district" value={district} />

          {/* The pin travels with the order. Bounded by the schema and by a
              CHECK in the database, and ignored entirely when absent. */}
          {picked ? (
            <>
              <input type="hidden" name="lat" value={picked.lat} />
              <input type="hidden" name="lng" value={picked.lng} />
              <input type="hidden" name="place_label" value={picked.label} />
            </>
          ) : null}

          <LocationPicker value={picked} onChange={applyLocation} />

          {state.fieldErrors?.district ? (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {state.fieldErrors.district}
            </p>
          ) : null}

          {zoneSlug === "outside-dhaka" ? (
            <div className="mt-3">
              <label
                htmlFor="outside-city"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Your city or district <span className="text-danger">*</span>
              </label>
              <Input
                id="outside-city"
                required
                value={outsideCity}
                onChange={(e) => setOutsideCity(e.target.value)}
                placeholder="e.g. Sylhet"
                invalid={Boolean(state.fieldErrors?.district)}
              />
              <p className="mt-1 text-xs text-ink-muted">
                The charge is the same anywhere outside Dhaka — this is only so
                the courier knows where to go.
              </p>
            </div>
          ) : null}

          {isPickup ? (
            <p className="mt-3 rounded-lg border border-success/20 bg-success-soft px-3 py-2 text-xs leading-5 text-success">
              Collect from {showroomAddress}. We will call you when it is ready —
              no delivery address needed.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">Payment method</h2>

          {/*
            Credit settles part of the order before anything else is collected,
            so it belongs above the method rather than beside the total. The
            amount actually applied is decided by place_order from the ledger —
            this checkbox is an intent, not a figure.
          */}
          {creditPaisa > 0 ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-success/20 bg-success-soft p-3">
              <input
                type="checkbox"
                name="use_credit"
                checked={useCredit}
                onChange={(e) => setUseCredit(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-success"
              />
              <span className="text-sm">
                <span className="flex items-center gap-1.5 font-medium text-success">
                  <Wallet size={14} />
                  Use my {formatTaka(creditPaisa)} credit
                </span>
                <span className="mt-0.5 block text-xs text-success/80">
                  {creditPaisa >= quote.total_paisa
                    ? "Covers this order in full."
                    : `Leaves ${formatTaka(quote.total_paisa - creditPaisa)} to pay.`}
                </span>
              </span>
            </label>
          ) : null}

          {/*
            Full or partial. Only offered on a prepaid method: "pay 10% now"
            is meaningless when the whole thing is already collected at the
            door, so choosing cash on delivery hides it rather than showing a
            control that silently does nothing.
          */}
          {advance.enabled && method !== "cod" ? (
            <>
              <div className="mt-3 flex flex-wrap gap-4">
                {([
                  ["full", "Full Payment"],
                  ["partial", `Partial Payment (${advance.percent}%)`],
                ] as const).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="radio"
                      name="payment_plan"
                      value={value}
                      checked={plan === value}
                      onChange={() => setPlan(value)}
                      className="size-4 accent-brand-600"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {/* The form posts a checkbox-style value; the radios above are
                  the visible control. */}
              {plan === "partial" ? (
                <input type="hidden" name="partial_payment" value="on" />
              ) : null}

              {plan === "partial" ? (
                <div className="mt-3 rounded-lg border border-brand-600/15 bg-brand-50/60 p-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-semibold text-brand-700">Pay now:</span>
                    <span className="text-base font-bold tabular text-brand-700">
                      {formatTaka(advanceNowPaisa)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    Remaining{" "}
                    <strong className="font-semibold tabular">
                      {formatTaka(quote.total_paisa - advanceNowPaisa)}
                    </strong>{" "}
                    to the courier on delivery.
                  </p>
                  <p className="mt-1.5 text-[11px] leading-4 text-ink-muted">
                    {advance.percent}% of the subtotal plus the full delivery
                    charge, and never less than {formatTaka(advance.minPaisa)}.
                    We pay the courier in full either way, which is why delivery
                    is not split.
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          {/* Prepaid orders are held, not reserved forever: unpaid ones are
              cancelled and the stock goes back. Saying so here is fairer than
              letting the cancellation be a surprise. */}
          {method !== "cod" ? (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-xs leading-5 text-warning">
              <Clock size={13} className="mt-0.5 shrink-0" />
              Pay within {paymentWindowMinutes} minutes of placing the order, or
              it is cancelled automatically and the items go back on sale.
            </p>
          ) : null}

          {/* Never a form that can only fail: with no method switched on,
              say so plainly instead of letting the order bounce off the
              validator with nothing highlighted. */}
          {paymentOptions.length === 0 ? (
            <p role="alert" className="mt-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              Ordering online is paused — no payment method is switched on. Please call
              or message us to order.
            </p>
          ) : null}

          <div className="mt-3 space-y-2">
            {paymentOptions.map((o) => {
              const Icon =
                ((Icons as unknown as Record<string, LucideIcon>)[o.icon]) ??
                Icons.CreditCard;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    method === o.id
                      ? "border-brand-600 bg-brand-50"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={o.id}
                    checked={method === o.id}
                    onChange={() => setMethod(o.id)}
                    className="mt-1 accent-brand-600"
                    required
                  />
                  <Icon size={18} className="mt-0.5 shrink-0 text-ink-soft" />
                  <span className="text-sm">
                    <span className="font-medium text-ink">{o.label}</span>
                    <span className="mt-0.5 block text-ink-muted">{o.description}</span>
                  </span>
                </label>
              );
            })}
          </div>

          {state.fieldErrors?.payment_method ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              Choose how you want to pay.
            </p>
          ) : null}

          {codBlocked ? (
            <p className="mt-3 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-xs leading-5 text-warning">
              Orders above {formatTaka(codAdvanceThresholdPaisa)} need an advance
              payment before dispatch. Place the order and our team will call you to
              arrange it.
            </p>
          ) : null}

          {paymentOptions.length === 1 && paymentOptions[0]?.id === "cod" ? (
            <p className="mt-3 text-xs text-ink-muted">
              Online payment options appear here once bKash, Nagad or card
              credentials are configured.
            </p>
          ) : null}

          {/*
            Points, spent as money. The taka figure here is what the balance is
            worth at the configured rate — place_order recomputes it against
            the ledger under a lock and caps it at what the order is actually
            worth, so this can only ever be optimistic, never authoritative.
          */}
          {points &&
          points.enabled &&
          points.balance >= Math.max(1, points.minRedeemPoints) ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-brand-600/20 bg-brand-50/50 p-3">
              <input
                type="checkbox"
                name="redeem_points"
                checked={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-brand-600"
              />
              <span className="text-sm">
                <span className="flex items-center gap-1.5 font-medium text-brand-700">
                  <Sparkles size={14} />
                  Use my {points.balance.toLocaleString()} points
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  Worth up to{" "}
                  {formatTaka(points.balance * points.paisaPerPoint)} off this
                  order.
                </span>
              </span>
            </label>
          ) : null}

          <CreditAccountOption phone={phone} orderTotalPaisa={quote.total_paisa} />
        </section>
      </div>

      <aside className="lg:sticky lg:top-32 lg:h-fit">
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">Order summary</h2>

          <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {quote.lines.map((l) => (
              <li key={l.cart_item_id} className="flex gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken">
                  {l.image_url ? (
                    <Image
                      src={l.image_url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white tabular">
                    {l.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="clamp-2 text-xs font-medium leading-4 text-ink">
                    {l.product_name}
                  </p>
                  {l.variant_name ? (
                    <p className="text-[11px] text-ink-muted">{l.variant_name}</p>
                  ) : null}
                </div>
                <span className="tabular shrink-0 text-xs font-medium text-ink">
                  {formatTaka(l.line_total_paisa)}
                </span>
              </li>
            ))}
          </ul>

          {/*
            A second entry point for the code, because this is where people
            remember they have one. It re-quotes through the same SQL the cart
            uses, so a code applied here is validated identically.
          */}
          <div className="mt-4 border-t border-line pt-4">
            {quote.coupon ? (
              <div className="flex items-center justify-between rounded-lg border border-success/20 bg-success-soft px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-success">
                  <Tag size={14} />
                  {quote.coupon.code}
                </span>
                <button
                  type="button"
                  onClick={() => submitCheckoutCoupon("")}
                  disabled={couponPending}
                  className="text-success/70 hover:text-success"
                  aria-label="Remove coupon"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="h-9 text-sm uppercase"
                  /* Enter must not submit the order. */
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (couponCode.trim()) submitCheckoutCoupon(couponCode.trim());
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={couponPending}
                  disabled={!couponCode.trim()}
                  onClick={() => submitCheckoutCoupon(couponCode.trim())}
                >
                  Apply
                </Button>
              </div>
            )}

            {quote.coupon_error ? (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                That code cannot be used on this order.
              </p>
            ) : null}
          </div>

          <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="tabular font-medium text-ink">
                {formatTaka(quote.subtotal_paisa)}
              </dd>
            </div>

            {quote.promo_discount_paisa > 0 ? (
              <div className="flex justify-between">
                <dt className="flex items-center gap-1 text-success">
                  <Layers size={13} />
                  Offers
                </dt>
                <dd className="tabular font-medium text-success">
                  −{formatTaka(quote.promo_discount_paisa)}
                </dd>
              </div>
            ) : null}

            {quote.discount_paisa > 0 ? (
              <div className="flex justify-between">
                <dt className="flex items-center gap-1 text-success">
                  <Tag size={13} />
                  {quote.coupon?.code ?? "Discount"}
                </dt>
                <dd className="tabular font-medium text-success">
                  −{formatTaka(quote.discount_paisa)}
                </dd>
              </div>
            ) : null}

            <div className="flex justify-between">
              <dt className="flex items-center gap-1 text-ink-muted">
                <Truck size={13} />
                Delivery
              </dt>
              <dd className="tabular font-medium text-ink">
                {!district ? (
                  <span className="text-ink-faint">Select a district</span>
                ) : awaitingDeliveryQuote ? (
                  <span className="text-ink-faint">Calculating…</span>
                ) : quote.delivery_fee_paisa === 0 ? (
                  <span className="text-success">Free</span>
                ) : (
                  formatTaka(quote.delivery_fee_paisa)
                )}
              </dd>
            </div>

            {quote.delivery_zone ? (
              <p className="text-xs text-ink-muted">
                {quote.delivery_zone.name} · {quote.delivery_zone.min_days}–
                {quote.delivery_zone.max_days} days
              </p>
            ) : null}

            <div className="flex justify-between border-t border-line pt-3 text-base">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="tabular font-bold text-ink">
                {awaitingDeliveryQuote ? (
                  <span className="font-medium text-ink-faint">Calculating…</span>
                ) : (
                  formatTaka(quote.total_paisa)
                )}
              </dd>
            </div>
          </dl>

          {state.error ? (
            <p role="alert" className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            block
            loading={pending}
            disabled={!district || paymentOptions.length === 0}
            className="mt-4"
          >
            Place order
          </Button>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-ink-muted">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-success" />
            Your total is calculated on our server from live prices — it cannot be
            changed from your browser.
          </p>

          {!signedIn ? (
            <p className="mt-2 text-[11px] text-ink-muted">
              Checking out as a guest.{" "}
              <Link href="/sign-in?next=/checkout" className="text-brand-600">
                Sign in
              </Link>{" "}
              to save your address and track orders.
            </p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}
