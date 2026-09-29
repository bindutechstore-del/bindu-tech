/**
 * Site theme shape, defaults and validation.
 *
 * Deliberately free of any server import. The admin design form is a Client
 * Component and needs COLOR_FIELDS and FONT_CHOICES to render; when these
 * lived beside the Supabase query, importing them dragged `next/headers` into
 * the client bundle and the build failed. Reading the stored theme lives in
 * lib/queries/theme.ts, which is server-only.
 *
 * Site theme, controlled from /admin/design.
 *
 * The whole design system is already CSS custom properties in globals.css, so
 * "give the admin control of the look" needs no new table and no rebuild: the
 * stored values are emitted as a `:root` override in the document head and the
 * cascade does the rest. Every component keeps using `text-ink` or
 * `bg-brand-600` and picks up the change for free.
 *
 * Fonts are a CHOICE from a fixed list rather than free text. next/font
 * subsets and self-hosts at build time, which is what keeps them off the
 * critical path — a font named at runtime could not be subset, would cost a
 * blocking request to a third party, and would flash. The list below is the
 * set that is actually compiled in.
 */

export const FONT_CHOICES = [
  { id: "sora", label: "Sora — geometric, technical" },
  { id: "jakarta", label: "Plus Jakarta Sans — warm, modern" },
  { id: "inter", label: "Inter — neutral, classic UI" },
  { id: "outfit", label: "Outfit — rounded, friendly" },
  { id: "space", label: "Space Grotesk — quirky, distinctive" },
  { id: "manrope", label: "Manrope — clean, geometric" },
] as const;

export type FontChoice = (typeof FONT_CHOICES)[number]["id"];

export const COLOR_FIELDS = [
  { key: "brand600", label: "Primary", hint: "Buttons, links, active states" },
  { key: "brand700", label: "Primary (hover)", hint: "Darker press state" },
  { key: "ink", label: "Text", hint: "Headings and body copy" },
  { key: "surface", label: "Surface", hint: "Cards and panels" },
  { key: "surfaceSunken", label: "Page background", hint: "Behind the cards" },
  { key: "danger", label: "Sale / danger", hint: "Discounts, errors, the Sale row" },
  { key: "success", label: "Success", hint: "In stock, delivered, confirmations" },
  { key: "warning", label: "Warning", hint: "Pending states and low stock" },
] as const;

export type ColorKey = (typeof COLOR_FIELDS)[number]["key"];

export interface SiteTheme {
  headingFont: FontChoice;
  bodyFont: FontChoice;
  /** Hex, `#rrggbb`. */
  colors: Record<ColorKey, string>;
  /** Corner rounding for cards and buttons, in rem. */
  radius: number;
}

/**
 * The compiled-in default — identical to what globals.css already ships, so an
 * untouched store renders exactly as designed and the override is a no-op.
 */
export const DEFAULT_THEME: SiteTheme = {
  headingFont: "sora",
  bodyFont: "jakarta",
  // These must equal the values in app/globals.css. The previous copy had
  // drifted — hover, danger, success and warning were all slightly off — so
  // "Reset to default" restored colours that had never actually been the
  // design.
  colors: {
    brand600: "#016952",
    brand700: "#015443",
    ink: "#14161a",
    surface: "#ffffff",
    surfaceSunken: "#f7f7f5",
    danger: "#be123c",
    success: "#0f766e",
    warning: "#b45309",
  },
  radius: 0.75,
};

/**
 * The client's brand palette, offered as one-click swatches on every colour
 * field in /admin/design. Swatches, not a straitjacket: the free picker stays,
 * because a palette of eleven cannot anticipate every combination.
 *
 * Names are the client's own, in Bangla. The last had no name supplied and is
 * labelled plainly as yellow.
 */
export const BRAND_PALETTE: { hex: string; bn: string; en: string }[] = [
  // The Bindu Tech logo green — the store's own colour.
  { hex: "#016952", bn: "বিন্দু গ্রিন", en: "Bindu green" },
  { hex: "#0b0f1a", bn: "মিডনাইট নেভি", en: "Midnight navy" },
  { hex: "#151b2b", bn: "ডার্ক স্লেট", en: "Dark slate" },
  { hex: "#6c5ce7", bn: "ভায়োলেট", en: "Violet" },
  { hex: "#00e5ff", bn: "নিয়ন সায়ান", en: "Neon cyan" },
  { hex: "#f2f4f8", bn: "অফ-হোয়াইট", en: "Off-white" },
  { hex: "#0f172a", bn: "ডিপ নেভি", en: "Deep navy" },
  { hex: "#ff6a00", bn: "অরেঞ্জ", en: "Orange" },
  { hex: "#f3f4f6", bn: "লাইট গ্রে", en: "Light grey" },
  { hex: "#111111", bn: "জেট ব্ল্যাক", en: "Jet black" },
  { hex: "#ff2e4d", bn: "ক্রিমসন রেড", en: "Crimson red" },
  { hex: "#ffd400", bn: "হলুদ", en: "Yellow" },
];

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/**
 * WCAG contrast ratio between two #rrggbb colours, 1 to 21.
 *
 * Used by the design form to warn before a choice ships: buttons print WHITE
 * text on the primary colour, so a neon cyan or yellow primary produces
 * buttons nobody can read. 4.5 is the WCAG AA bar for body text, 3 for large
 * text and interface components.
 */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Anything stored is untrusted: a bad hex would emit broken CSS site-wide. */
export function sanitiseTheme(raw: unknown): SiteTheme {
  const v = (raw ?? {}) as Partial<SiteTheme>;
  const fonts = new Set(FONT_CHOICES.map((f) => f.id as string));

  const colors = { ...DEFAULT_THEME.colors };
  const given = (v.colors ?? {}) as Record<string, unknown>;
  for (const { key } of COLOR_FIELDS) {
    const candidate = given[key];
    if (typeof candidate === "string" && HEX.test(candidate)) {
      colors[key] = candidate.toLowerCase();
    }
  }

  const radius = Number(v.radius);

  return {
    headingFont: fonts.has(String(v.headingFont))
      ? (v.headingFont as FontChoice)
      : DEFAULT_THEME.headingFont,
    bodyFont: fonts.has(String(v.bodyFont))
      ? (v.bodyFont as FontChoice)
      : DEFAULT_THEME.bodyFont,
    colors,
    // Clamp rather than reject: a 40rem radius turns every card into a circle.
    radius:
      Number.isFinite(radius) && radius >= 0 && radius <= 2
        ? radius
        : DEFAULT_THEME.radius,
  };
}

/**
 * The `:root` block that overrides globals.css.
 *
 * Only the tokens an admin can actually change are emitted — everything else
 * stays exactly as authored. Values are already validated as `#rrggbb` by
 * `sanitiseTheme`, so nothing here can break out of the declaration.
 */
export function themeToCss(theme: SiteTheme): string {
  const c = theme.colors;
  const d = DEFAULT_THEME.colors;
  const mix = (a: string, pct: number, b: string) =>
    `color-mix(in srgb, ${a} ${pct}%, ${b})`;

  const vars: string[] = [
    `--color-brand-600:${c.brand600}`,
    `--color-brand-700:${c.brand700}`,
    `--color-ink:${c.ink}`,
    `--color-surface:${c.surface}`,
    `--color-surface-sunken:${c.surfaceSunken}`,
    `--color-danger:${c.danger}`,
    `--color-success:${c.success}`,
    `--color-warning:${c.warning}`,
    `--radius-card:${theme.radius}rem`,
  ];

  /*
   * Only the eight colours above are chosen; the rest of the system is tints
   * and shades of them. Those used to stay hardcoded in globals.css, so picking
   * a violet primary left `brand-50` — the selected-state background, used 25
   * times — as the ORIGINAL blue: a violet border on a blue card.
   *
   * Each group is derived only when its source colour has actually changed, so
   * an untouched store still renders exactly the hand-tuned values in
   * globals.css rather than a close approximation of them.
   */
  if (c.brand600 !== d.brand600) {
    vars.push(
      `--color-brand-50:${mix(c.brand600, 8, c.surface)}`,
      `--color-brand-100:${mix(c.brand600, 14, c.surface)}`,
      `--color-brand-200:${mix(c.brand600, 26, c.surface)}`,
      `--color-brand-300:${mix(c.brand600, 42, c.surface)}`,
      `--color-brand-400:${mix(c.brand600, 62, c.surface)}`,
      `--color-brand-500:${mix(c.brand600, 82, c.surface)}`,
    );
  }
  if (c.brand700 !== d.brand700) {
    vars.push(
      `--color-brand-800:${mix(c.brand700, 82, "#000")}`,
      `--color-brand-900:${mix(c.brand700, 64, "#000")}`,
    );
  }
  // Text greys and hairlines are mixed from the text colour INTO the surface,
  // not into white — which is what keeps them legible on a dark theme too.
  if (c.ink !== d.ink || c.surface !== d.surface) {
    vars.push(
      `--color-ink-soft:${mix(c.ink, 80, c.surface)}`,
      // 70% / 64% keep both greys at 4.5:1 or better against the surface.
      `--color-ink-muted:${mix(c.ink, 70, c.surface)}`,
      `--color-ink-faint:${mix(c.ink, 64, c.surface)}`,
      `--color-line:${mix(c.ink, 11, c.surface)}`,
      `--color-line-strong:${mix(c.ink, 20, c.surface)}`,
      `--color-surface-raised:${c.surface}`,
    );
  }
  if (c.danger !== d.danger || c.surface !== d.surface) {
    vars.push(`--color-danger-soft:${mix(c.danger, 10, c.surface)}`);
  }
  if (c.success !== d.success || c.surface !== d.surface) {
    vars.push(`--color-success-soft:${mix(c.success, 10, c.surface)}`);
  }
  if (c.warning !== d.warning || c.surface !== d.surface) {
    vars.push(`--color-warning-soft:${mix(c.warning, 12, c.surface)}`);
  }

  return `:root{${vars.join(";")};}`;
}
