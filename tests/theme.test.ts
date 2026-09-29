import { describe, it, expect } from "vitest";
import {
  BRAND_PALETTE,
  DEFAULT_THEME,
  contrastRatio,
  sanitiseTheme,
  themeToCss,
} from "@/lib/theme/schema";
import { getContentPage, withStoreName } from "@/lib/content/pages";

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#6c5ce7", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#6c5ce7"),
      10,
    );
  });

  it("flags white on the palette's yellow as unreadable", () => {
    expect(contrastRatio("#ffffff", "#ffd400")).toBeLessThan(2);
  });
});

describe("themeToCss", () => {
  it("leaves the hand-tuned tints alone for the default theme", () => {
    const css = themeToCss(DEFAULT_THEME);
    expect(css).not.toContain("--color-brand-50:");
    expect(css).not.toContain("--color-ink-muted:");
    expect(css).not.toContain("color-mix");
  });

  it("derives the brand tints from a changed primary", () => {
    const css = themeToCss({
      ...DEFAULT_THEME,
      colors: { ...DEFAULT_THEME.colors, brand600: "#6c5ce7" },
    });
    expect(css).toContain("--color-brand-600:#6c5ce7");
    expect(css).toMatch(/--color-brand-50:color-mix\(in srgb, #6c5ce7 8%, #ffffff\)/);
    // Hover shades follow brand700, which did not change.
    expect(css).not.toContain("--color-brand-800:");
  });

  it("derives greys from text into the surface, for dark themes too", () => {
    const css = themeToCss({
      ...DEFAULT_THEME,
      colors: { ...DEFAULT_THEME.colors, ink: "#f2f4f8", surface: "#0b0f1a" },
    });
    expect(css).toContain("--color-ink-muted:color-mix(in srgb, #f2f4f8 70%, #0b0f1a)");
    expect(css).toContain("--color-surface-raised:#0b0f1a");
  });
});

describe("BRAND_PALETTE", () => {
  it("holds the logo green plus the client's eleven colours, each a valid theme colour", () => {
    expect(BRAND_PALETTE).toHaveLength(12);
    expect(BRAND_PALETTE[0].hex).toBe("#016952");
    for (const p of BRAND_PALETTE) {
      const t = sanitiseTheme({ colors: { brand600: p.hex } });
      expect(t.colors.brand600).toBe(p.hex);
    }
  });
});

describe("withStoreName", () => {
  it("replaces the token everywhere in a content page", () => {
    const about = getContentPage("about")!;
    const filled = withStoreName(about, 'Bidyut "Tech"');
    expect(filled.title).toBe('About Bidyut "Tech"');
    expect(JSON.stringify(filled)).not.toContain("{{store}}");
    // The registry itself is not mutated.
    expect(about.title).toBe("About {{store}}");
  });
});
