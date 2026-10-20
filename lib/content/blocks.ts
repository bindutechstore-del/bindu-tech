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

export type Block =
  /** "Title" in the editor: a section heading, underlined. */
  | { type: "heading"; text: string }
  /** "Subtitle" in the editor: a smaller heading inside a section. */
  | { type: "subheading"; text: string }
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
      case "subheading":
        if (clip(v.text, 200).trim()) out.push({ type: v.type, text: clip(v.text, 200).trim() });
        break;
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
