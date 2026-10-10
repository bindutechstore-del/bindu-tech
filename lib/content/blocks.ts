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
  | { type: "heading"; text: string }
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
        if (clip(v.text, 200).trim()) out.push({ type: "heading", text: clip(v.text, 200).trim() });
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

/**
 * `**bold**` → bold runs. The only formatting the editor offers: enough to
 * pick out "৭২ ঘণ্টার মধ্যে" in a policy without opening the door to HTML.
 */
export function boldRuns(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}
