import type { ContentPage } from "./pages";

/**
 * The building blocks of an editable information page (admin → Pages).
 *
 * No server imports: the admin editor (a Client Component) builds and
 * previews these, the storefront renders them, and the save action validates
 * them with `sanitiseBlocks` — anything stored is untrusted.
 */

export const TONES = ["danger", "warning", "info", "note", "success"] as const;
export type Tone = (typeof TONES)[number];

/** How each notice box looks, and what the editor calls it. */
export const TONE_INFO: Record<Tone, { label: string; hint: string }> = {
  danger: { label: "Red warning", hint: "সতর্কীকরণ — must-read rules" },
  warning: { label: "Orange caution", hint: "Things to be careful about" },
  info: { label: "Blue info", hint: "Helpful details" },
  note: { label: "Yellow note", hint: "Conditions and exceptions" },
  success: { label: "Green good news", hint: "Promises and guarantees" },
};

/** Icons a Title or Subtitle can carry — a fixed set, labelled for the editor. */
export const TITLE_ICONS = {
  shield: "Warranty / ওয়ারেন্টি",
  truck: "Delivery / ডেলিভারি",
  return: "Return / রিটার্ন",
  card: "Payment / পেমেন্ট",
  wallet: "bKash, Nagad / ওয়ালেট",
  money: "Cash / টাকা",
  phone: "Phone / ফোন",
  mail: "Email / ইমেইল",
  location: "Address / ঠিকানা",
  clock: "Time / সময়",
  info: "Info / তথ্য",
  warning: "Warning / সতর্কতা",
  check: "Done / সঠিক",
  package: "Product / প্রোডাক্ট",
  video: "Video / ভিডিও",
  gift: "Offer / অফার",
  star: "Special / বিশেষ",
  lock: "Privacy / গোপনীয়তা",
  help: "Question / প্রশ্ন",
  file: "Rules / নিয়ম",
  support: "Support / সাপোর্ট",
} as const;
export type TitleIcon = keyof typeof TITLE_ICONS;

/** A Title's colour: the shop's brand colour or one of the text colours. */
export type TitleColor = "brand" | TextColor;

interface TitleStyle {
  /** Centred instead of left-aligned. */
  align?: "center";
  color?: TitleColor;
  icon?: TitleIcon;
}

export type Block =
  /** "Title" in the editor: a section heading, underlined. */
  | ({ type: "heading"; text: string } & TitleStyle)
  /** "Subtitle" in the editor: a smaller heading inside a section. */
  | ({ type: "subheading"; text: string } & TitleStyle)
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone: Tone; title: string; text: string }
  | { type: "faq"; q: string; a: string };

export interface PageContent {
  title: string;
  subtitle: string;
  description: string;
  /** `#rrggbb`, or "" for no banner. */
  bannerColor: string;
  /** Each section (a Title and what follows it) in its own box. */
  boxed: boolean;
  blocks: Block[];
}

const MAX_BLOCKS = 120;
const MAX_TEXT = 5000;
const clip = (v: unknown, max = MAX_TEXT) => String(v ?? "").slice(0, max);

/** Keep only well-formed blocks, with every string bounded. */
export function sanitiseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  for (const b of raw.slice(0, MAX_BLOCKS)) {
    if (!b || typeof b !== "object") continue;
    const v = b as Record<string, unknown>;
    switch (v.type) {
      case "heading":
      case "subheading": {
        const text = clip(v.text, 200).trim();
        if (!text) break;
        // hasOwn, not `in`: "toString" is "in" every object.
        const color =
          v.color === "brand" || (typeof v.color === "string" && Object.hasOwn(TEXT_COLORS, v.color))
            ? (v.color as TitleColor)
            : undefined;
        const icon =
          typeof v.icon === "string" && Object.hasOwn(TITLE_ICONS, v.icon) ? (v.icon as TitleIcon) : undefined;
        out.push({
          type: v.type,
          text,
          ...(v.align === "center" ? { align: "center" as const } : {}),
          ...(color ? { color } : {}),
          ...(icon ? { icon } : {}),
        });
        break;
      }
      case "paragraph":
        if (clip(v.text).trim()) out.push({ type: "paragraph", text: clip(v.text).trim() });
        break;
      case "list": {
        const items = (Array.isArray(v.items) ? v.items : [])
          .map((i) => clip(i, 1000).trim())
          .filter(Boolean)
          .slice(0, 60);
        if (items.length) out.push({ type: "list", items });
        break;
      }
      case "callout": {
        const tone = TONES.includes(v.tone as Tone) ? (v.tone as Tone) : "info";
        const title = clip(v.title, 200).trim();
        const text = clip(v.text).trim();
        if (title || text) out.push({ type: "callout", tone, title, text });
        break;
      }
      case "faq": {
        const q = clip(v.q, 300).trim();
        const a = clip(v.a).trim();
        if (q && a) out.push({ type: "faq", q, a });
        break;
      }
    }
  }
  return out;
}

/** The built-in page (lib/content/pages.ts) as blocks, to start editing from. */
export function blocksFromPage(page: ContentPage): Block[] {
  const blocks: Block[] = [];
  for (const s of page.sections) {
    if (s.heading) blocks.push({ type: "heading", text: s.heading });
    for (const p of s.body ?? []) blocks.push({ type: "paragraph", text: p });
    if (s.points?.length) blocks.push({ type: "list", items: [...s.points] });
    for (const f of s.faqs ?? []) blocks.push({ type: "faq", q: f.q, a: f.a });
  }
  return blocks;
}

/** Text colours the editor offers — each readable on white and on the notice boxes. */
export const TEXT_COLORS = {
  red: "#dc2626",
  orange: "#c2410c",
  green: "#15803d",
  blue: "#1d4ed8",
  purple: "#7e22ce",
} as const;
export type TextColor = keyof typeof TEXT_COLORS;

export interface Run {
  text: string;
  bold?: boolean;
  underline?: boolean;
  color?: TextColor;
}

// *bold* with single stars too: that is WhatsApp's bold, and what the shop
// owner typed first ("*BinduTech*") before the toolbar existed. No space just
// inside the stars, so "5 * 3 * 2" stays as written.
const TOKEN =
  /\*\*([\s\S]+?)\*\*|\*(?![\s*])([^*\n]+?)(?<!\s)\*|__([\s\S]+?)__|\[(red|orange|green|blue|purple)\]([\s\S]+?)\[\/\4\]/;

/**
 * Inline formatting, as the editor's toolbar writes it:
 * `**bold**` (or WhatsApp-style `*bold*`), `__underline__` and `[red]coloured[/red]` (red, orange, green,
 * blue, purple), nestable. Plain markers rather than HTML, so nothing typed
 * into a page can inject markup.
 */
export function inlineRuns(text: string, style: Omit<Run, "text"> = {}, depth = 0): Run[] {
  const out: Run[] = [];
  let rest = text;
  while (rest) {
    const m = depth < 4 ? TOKEN.exec(rest) : null;
    if (!m) {
      out.push({ text: rest, ...style });
      break;
    }
    if (m.index > 0) out.push({ text: rest.slice(0, m.index), ...style });
    const bold = m[1] ?? m[2];
    if (bold !== undefined) out.push(...inlineRuns(bold, { ...style, bold: true }, depth + 1));
    else if (m[3] !== undefined) out.push(...inlineRuns(m[3], { ...style, underline: true }, depth + 1));
    else out.push(...inlineRuns(m[5], { ...style, color: m[4] as TextColor }, depth + 1));
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}
