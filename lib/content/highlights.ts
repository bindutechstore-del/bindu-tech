/**
 * The "Buying from <store>" cards on the homepage, editable in
 * /admin/settings and stored in the `home_highlights` setting.
 *
 * Client-safe (no server imports): the admin form needs the icon list and the
 * limits, the storefront needs the defaults, and the save action re-validates
 * against the same rules.
 */

export const HIGHLIGHT_ICONS = [
  { id: "truck", label: "Delivery truck" },
  { id: "shield", label: "Shield (warranty)" },
  { id: "badge", label: "Badge (genuine)" },
  { id: "headphones", label: "Headset (support)" },
  { id: "wallet", label: "Wallet (payment)" },
  { id: "refresh", label: "Arrows (returns)" },
  { id: "gift", label: "Gift" },
  { id: "clock", label: "Clock" },
  { id: "star", label: "Star" },
  { id: "store", label: "Shop" },
] as const;

export type HighlightIcon = (typeof HIGHLIGHT_ICONS)[number]["id"];

export interface HomeHighlight {
  icon: HighlightIcon;
  title: string;
  body: string;
}

/** How many cards the homepage row holds. */
export const HIGHLIGHT_SLOTS = 4;
export const HIGHLIGHT_TITLE_MAX = 40;
export const HIGHLIGHT_BODY_MAX = 180;

/**
 * What the homepage showed before these became editable, with the delivery
 * days corrected to the current zones (1–3 inside Dhaka, 2–5 outside).
 */
export const DEFAULT_HIGHLIGHTS: HomeHighlight[] = [
  {
    icon: "truck",
    title: "Nationwide delivery",
    body: "Inside Dhaka in 1–3 days, everywhere else in 2–5. Cash on delivery available on every order.",
  },
  {
    icon: "shield",
    title: "Official warranty",
    body: "Claimable at the brand's authorised Bangladesh service centre. We re-issue invoices any time.",
  },
  {
    icon: "badge",
    title: "Genuine stock only",
    body: "No refurbished units sold as new. Every serial is verifiable before you pay.",
  },
  {
    icon: "headphones",
    title: "Real humans",
    body: "WhatsApp, Messenger or a phone call. Saturday to Thursday, 10:00–20:00.",
  },
];

const ICON_IDS = new Set<string>(HIGHLIGHT_ICONS.map((i) => i.id));

/**
 * Whatever is stored, as something safe to render: known icons only, trimmed
 * and length-capped text, empty cards dropped. A missing or malformed setting
 * falls back to the defaults rather than an empty row.
 */
export function sanitiseHighlights(raw: unknown): HomeHighlight[] {
  if (!Array.isArray(raw)) return DEFAULT_HIGHLIGHTS;
  return raw
    .slice(0, HIGHLIGHT_SLOTS)
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const icon = typeof o.icon === "string" && ICON_IDS.has(o.icon) ? o.icon : "badge";
      return {
        icon: icon as HighlightIcon,
        title: String(o.title ?? "").trim().slice(0, HIGHLIGHT_TITLE_MAX),
        body: String(o.body ?? "").trim().slice(0, HIGHLIGHT_BODY_MAX),
      };
    })
    .filter((h) => h.title || h.body);
}

/**
 * The homepage Delivery card, written from the live delivery options when
 * the admin has not typed their own. The old hardcoded sentence still
 * promised "suburbs" and free-delivery thresholds long after both were gone.
 */
export function deliveryNoteFromOptions(
  options: { name: string; feePaisa: number; minDays: number; maxDays: number }[],
  formatTaka: (paisa: number) => string,
): string {
  if (options.length === 0) return "Delivered across Bangladesh, with cash on delivery on every order.";
  const parts = options.map((o) => {
    const fee = o.feePaisa === 0 ? "free" : formatTaka(o.feePaisa);
    const days =
      o.minDays === o.maxDays
        ? `${o.minDays} ${o.minDays === 1 ? "day" : "days"}`
        : `${o.minDays}–${o.maxDays} days`;
    return `${o.name} ${fee} · ${days}.`;
  });
  return `${parts.join(" ")} Cash on delivery on every order.`;
}
