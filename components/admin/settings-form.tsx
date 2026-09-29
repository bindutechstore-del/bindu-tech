"use client";

import { startTransition, useActionState } from "react";
import { Lock } from "lucide-react";
import type { Setting } from "@/types/database";
import { saveSettings, type AdminState } from "@/lib/actions/admin";
import {
  HIGHLIGHT_BODY_MAX,
  HIGHLIGHT_ICONS,
  HIGHLIGHT_SLOTS,
  HIGHLIGHT_TITLE_MAX,
  type HomeHighlight,
} from "@/lib/content/highlights";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/field";
import { Card, Badge } from "@/components/ui/primitives";
import { ImageUploader } from "./image-uploader";

const initial: AdminState = { ok: false };

type Kind = "text" | "textarea" | "email" | "tel" | "number";

/**
 * Every setting the storefront shows, in plain words and in the place it
 * appears. The page used to list raw keys ("store description",
 * "cod advance threshold paisa") in one grid, so the footer paragraph was
 * editable but nobody could tell which box it was.
 */
const FIELDS: Record<string, { label: string; hint?: string; kind?: Kind }> = {
  store_name: { label: "Store name", hint: "Header, footer, page titles and the homepage" },
  store_tagline: { label: "Tagline", hint: "Top strip and the browser tab" },
  store_description: {
    label: "About the store",
    hint: "The paragraph under the store name in the footer",
    kind: "textarea",
  },
  support_phone: { label: "Phone", hint: "Header, footer, contact page", kind: "tel" },
  support_whatsapp: { label: "WhatsApp number", kind: "tel" },
  support_email: { label: "Email", hint: "Footer and contact page", kind: "email" },
  support_hours: { label: "Opening hours", hint: "e.g. Saturday–Thursday, 10:00–20:00" },
  showroom_address: { label: "Address", hint: "Footer and contact page" },
  warranty_note: {
    label: "Warranty & replacement",
    hint: "The homepage Warranty card and every product page",
    kind: "textarea",
  },
  home_delivery_note: {
    label: "Delivery card",
    hint: "Leave empty to write it from the delivery charges below — it then updates itself when a charge changes",
    kind: "textarea",
  },
  return_window_days: { label: "Return window (days)", kind: "number" },
  low_stock_banner_threshold: {
    label: "“Only N left” shows at or below",
    kind: "number",
  },
  cod_advance_threshold_paisa: {
    label: "Cash-on-delivery advance above (paisa)",
    hint: "In paisa: ৳1 = 100. 5000000 = ৳50,000",
    kind: "number",
  },
  bkash_receive_number: { label: "bKash number customers pay to", kind: "tel" },
  bkash_account_type: { label: "bKash account type", hint: "e.g. Personal or Merchant" },
  nagad_receive_number: { label: "Nagad number customers pay to", kind: "tel" },
  nagad_account_type: { label: "Nagad account type", hint: "e.g. Personal or Merchant" },
  manual_payment_note: {
    label: "Payment instructions",
    hint: "Shown to customers paying by bKash or Nagad",
    kind: "textarea",
  },
  analytics_retention_days: { label: "Keep analytics for (days)", kind: "number" },
};

const GROUPS: { title: string; description: string; keys: string[] }[] = [
  {
    title: "Store",
    description: "Your name and the short line that sits beside it.",
    keys: ["store_name", "store_tagline", "store_description"],
  },
  {
    title: "Contact",
    description: "How customers reach you. Shown in the footer and on the Contact page.",
    keys: ["support_phone", "support_whatsapp", "support_email", "support_hours", "showroom_address"],
  },
];

/** Shown in their own sections, or on their own admin page. */
const HANDLED = new Set([
  ...GROUPS.flatMap((g) => g.keys),
  "warranty_note",
  "home_delivery_note",
  "home_highlights",
  "social_links",
  "site_theme", // Design page
  "logo_url", // Store card, as an upload
  "supabase_url", // internal
  // "Checkout & rewards" below
  "advance_payment",
  "payment_window",
  "points_rules",
  "referral_reward",
  "delivery_payment_adjust",
]);

type Obj = Record<string, unknown>;
const n = (v: unknown, fallback: number) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};

const SOCIAL = [
  { key: "facebook", label: "Facebook page", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourpage" },
  { key: "youtube", label: "YouTube channel", placeholder: "https://youtube.com/@yourchannel" },
] as const;

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function labelFor(key: string) {
  return FIELDS[key]?.label ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function SettingsForm({
  settings,
  highlights,
  deliveryAuto,
}: {
  settings: Setting[];
  /** Current homepage cards (defaults when never saved). */
  highlights: HomeHighlight[];
  /** What the Delivery card says when its box is left empty. */
  deliveryAuto: string;
}) {
  const [state, action, pending] = useActionState(saveSettings, initial);
  const errors = state.fieldErrors ?? {};

  const byKey = new Map(settings.map((s) => [s.key, s]));
  const social = (byKey.get("social_links")?.value ?? {}) as Record<string, string>;
  const other = settings.filter((s) => isScalar(s.value) && !HANDLED.has(s.key));
  const structured = settings.filter((s) => !isScalar(s.value) && !HANDLED.has(s.key));

  const field = (key: string) => {
    const meta = FIELDS[key] ?? {};
    const current = byKey.get(key)?.value;
    const id = `setting__${key}`;
    const common = {
      id,
      name: id,
      defaultValue: current == null ? "" : String(current),
      invalid: Boolean(errors[key]),
    };
    return (
      <Field
        key={key}
        label={labelFor(key)}
        htmlFor={id}
        hint={meta.hint}
        error={errors[key]}
        className={meta.kind === "textarea" ? "sm:col-span-2" : undefined}
      >
        {meta.kind === "textarea" ? (
          <Textarea
            {...common}
            rows={3}
            placeholder={key === "home_delivery_note" ? deliveryAuto : undefined}
          />
        ) : (
          <Input
            {...common}
            type={meta.kind === "email" ? "email" : meta.kind === "tel" ? "tel" : "text"}
            inputMode={meta.kind === "number" ? "numeric" : undefined}
          />
        )}
      </Field>
    );
  };

  const adv = (byKey.get("advance_payment")?.value ?? {}) as Obj;
  const win = (byKey.get("payment_window")?.value ?? {}) as Obj;
  const pts = (byKey.get("points_rules")?.value ?? {}) as Obj;
  const ref = (byKey.get("referral_reward")?.value ?? {}) as Obj;
  const adj = (byKey.get("delivery_payment_adjust")?.value ?? {}) as Obj;

  /** A number box for the rules section, in the units a person thinks in. */
  const ruleInput = (
    name: string,
    label: string,
    value: number,
    opts: { step?: string; hint?: string; suffix?: string } = {},
  ) => (
    <Field label={label} htmlFor={name} hint={opts.hint} error={errors[name]}>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type="number"
          step={opts.step ?? "1"}
          defaultValue={String(value)}
          invalid={Boolean(errors[name])}
          className={opts.suffix ? "pr-14" : undefined}
        />
        {opts.suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
            {opts.suffix}
          </span>
        ) : null}
      </div>
    </Field>
  );

  const toggle = (name: string, label: string, checked: boolean) => (
    <label className="flex items-center gap-2 text-sm font-medium text-ink">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="size-4 accent-brand-600"
      />
      {label}
    </label>
  );

  // Slots beyond the saved cards start empty, so a removed card can be
  // brought back (or a new one written) without touching the database.
  const slots = Array.from(
    { length: HIGHLIGHT_SLOTS },
    (_, i) => highlights[i] ?? { icon: "badge", title: "", body: "" },
  );

  // The form's fields are uncontrolled. When a save changes the stored values
  // (e.g. a cleared homepage card is dropped and the rest move up a slot),
  // this key changes and the form remounts from the saved data — otherwise
  // edited boxes kept their old slot while untouched ones followed the new
  // defaults, and the next save could lose or duplicate a card. A refused
  // save changes nothing stored, so what was typed stays put.
  const savedKey = JSON.stringify(settings.map((s) => [s.key, s.value]));

  return (
    <form
      key={savedKey}
      action={action}
      // No React 19 auto-reset: a refused save keeps everything typed.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-4"
    >
      {GROUPS.map((g) => (
        <Card key={g.title} className="p-5">
          <h2 className="text-sm font-semibold text-ink">{g.title}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">{g.description}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {g.keys.filter((k) => byKey.has(k)).map(field)}
          </div>
          {g.title === "Store" ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-ink">Logo</p>
              <p className="mb-2 text-xs text-ink-muted">
                Shown in the header instead of the store name. A wide logo on a transparent
                background (PNG) looks best.
              </p>
              <div className="max-w-xs">
                <ImageUploader
                  name="setting__logo_url"
                  bucket="banners"
                  folder="brand"
                  single
                  label="logo"
                  maxEdge={1200}
                  initial={byKey.get("logo_url")?.value ? [String(byKey.get("logo_url")?.value)] : []}
                />
              </div>
              {errors.logo_url ? (
                <p role="alert" className="mt-1 text-xs text-danger">
                  {errors.logo_url}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>
      ))}

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">Social links</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          The icons in the footer, and Messenger in the chat bubble. Leave a box
          empty to hide it.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SOCIAL.map((n) => (
            <Field
              key={n.key}
              label={n.label}
              htmlFor={`social__${n.key}`}
              error={errors[`social__${n.key}`]}
            >
              <Input
                id={`social__${n.key}`}
                name={`social__${n.key}`}
                type="url"
                defaultValue={social[n.key] ?? ""}
                placeholder={n.placeholder}
                invalid={Boolean(errors[`social__${n.key}`])}
              />
            </Field>
          ))}
          <Field
            label="Messenger username"
            htmlFor="social__messenger"
            hint="Your Facebook page's username — the chat bubble opens m.me/username"
            error={errors.social__messenger}
          >
            <Input
              id="social__messenger"
              name="social__messenger"
              defaultValue={social.messenger ?? ""}
              placeholder="e.g. bindutech"
              invalid={Boolean(errors.social__messenger)}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">Homepage</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          The “Buying from {String(byKey.get("store_name")?.value ?? "your store")}” cards,
          and the three cards below them. Clear a card&apos;s title and text to hide it.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {slots.map((h, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Card {i + 1}
              </p>
              <div className="mt-2 grid gap-3">
                <Field label="Icon" htmlFor={`highlight__${i}__icon`}>
                  <Select
                    id={`highlight__${i}__icon`}
                    name={`highlight__${i}__icon`}
                    defaultValue={h.icon}
                  >
                    {HIGHLIGHT_ICONS.map((ic) => (
                      <option key={ic.id} value={ic.id}>
                        {ic.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Title"
                  htmlFor={`highlight__${i}__title`}
                  error={errors[`highlight__${i}__title`]}
                >
                  <Input
                    id={`highlight__${i}__title`}
                    name={`highlight__${i}__title`}
                    defaultValue={h.title}
                    maxLength={HIGHLIGHT_TITLE_MAX}
                  />
                </Field>
                <Field
                  label="Text"
                  htmlFor={`highlight__${i}__body`}
                  error={errors[`highlight__${i}__body`]}
                >
                  <Textarea
                    id={`highlight__${i}__body`}
                    name={`highlight__${i}__body`}
                    defaultValue={h.body}
                    rows={2}
                    maxLength={HIGHLIGHT_BODY_MAX}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field("home_delivery_note")}
          {byKey.has("warranty_note") ? field("warranty_note") : null}
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          The “Talk to us” card is written from the phone number and opening hours above.
        </p>
      </Card>

      {other.length > 0 ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Orders &amp; payments</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Numbers and payment details used at checkout.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{other.map((s) => field(s.key))}</div>
        </Card>
      ) : null}

      <Card className="p-5">
        <input type="hidden" name="rules__on" value="1" />
        <h2 className="text-sm font-semibold text-ink">Checkout &amp; rewards</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          The rules checkout applies. The server re-checks every one of them when
          an order is placed.
        </p>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-line p-3">
            {toggle("rules__advance_enabled", "Offer “pay part now”", adv.enabled === true)}
            <div className="grid grid-cols-2 gap-3">
              {ruleInput("rules__advance_percent", "Advance (% of items)", n(adv.percent, 10), {
                step: "0.5",
                suffix: "%",
                hint: "Plus the full delivery charge",
              })}
              {ruleInput("rules__advance_min", "But at least", n(adv.min_paisa, 20000) / 100, {
                suffix: "৳",
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-line p-3">
            <p className="text-sm font-medium text-ink">bKash / Nagad payment window</p>
            {ruleInput("rules__payment_window", "Time to pay", n(win.minutes, 30), {
              suffix: "min",
              hint: "Unpaid orders are cancelled after this",
            })}
          </div>

          <div className="space-y-3 rounded-lg border border-line p-3">
            {toggle("rules__points_enabled", "Reward points", pts.enabled === true)}
            <div className="grid grid-cols-2 gap-3">
              {ruleInput("rules__points_value", "1 point is worth", n(pts.paisa_per_point, 100) / 100, {
                step: "0.01",
                suffix: "৳",
              })}
              {ruleInput("rules__points_min", "Spend from", n(pts.min_redeem_points, 100), {
                suffix: "pts",
                hint: "Fewest points a customer can use",
              })}
            </div>
            <p className="text-[11px] text-ink-faint">
              How many points a product earns is set on each product.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-line p-3">
            {toggle("rules__referral_enabled", "Refer & earn", ref.enabled === true)}
            <div className="grid grid-cols-2 gap-3">
              {ruleInput("rules__referral_new", "New customer gets", n(ref.referred_paisa, 5000) / 100, {
                suffix: "৳",
              })}
              {ruleInput("rules__referral_referrer", "Referrer gets", n(ref.referrer_paisa, 10000) / 100, {
                suffix: "৳",
                hint: "When the new customer's first order is delivered",
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-line p-3 lg:col-span-2">
            <p className="text-sm font-medium text-ink">Delivery discount for paying in advance</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {ruleInput("rules__prepaid_bkash", "bKash", Math.max(0, -n(adj.bkash, 0)) / 100, { suffix: "৳ off" })}
              {ruleInput("rules__prepaid_nagad", "Nagad", Math.max(0, -n(adj.nagad, 0)) / 100, { suffix: "৳ off" })}
              {ruleInput("rules__prepaid_card", "Card", Math.max(0, -n(adj.card, 0)) / 100, {
                suffix: "৳ off",
                hint: "Only matters once card payments are switched on",
              })}
            </div>
            <p className="text-[11px] text-ink-faint">
              Taken off the delivery charge, never below free. Cash on delivery pays the full charge.
            </p>
          </div>
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface/95 p-3 backdrop-blur">
        <Button type="submit" loading={pending}>
          Save settings
        </Button>
        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : state.ok && state.message ? (
          <p role="status" className="text-sm font-medium text-success">
            {state.message}
          </p>
        ) : null}
      </div>

      {structured.length > 0 ? (
        <Card className="p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Lock size={14} />
            Advanced (read-only)
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            These hold objects or lists. Edit them in the Supabase table editor —
            a malformed value here would break the storefront.
          </p>

          <ul className="mt-3 divide-y divide-line text-sm">
            {structured.map((s) => (
              <li key={s.key} className="py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize text-ink">
                    {s.key.replace(/_/g, " ")}
                  </span>
                  {!s.is_public ? <Badge>private</Badge> : null}
                </div>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-sunken px-3 py-2 text-[11px] text-ink-muted">
                  {JSON.stringify(s.value, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </form>
  );
}
