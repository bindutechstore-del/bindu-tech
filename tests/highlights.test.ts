import { describe, it, expect } from "vitest";
import {
  DEFAULT_HIGHLIGHTS,
  HIGHLIGHT_TITLE_MAX,
  deliveryNoteFromOptions,
  sanitiseHighlights,
} from "@/lib/content/highlights";
import { formatTaka } from "@/lib/utils/money";

describe("sanitiseHighlights", () => {
  it("falls back to the defaults when the setting is missing or malformed", () => {
    expect(sanitiseHighlights(undefined)).toEqual(DEFAULT_HIGHLIGHTS);
    expect(sanitiseHighlights("nope")).toEqual(DEFAULT_HIGHLIGHTS);
  });

  it("keeps an explicitly empty list empty, so every card can be removed", () => {
    expect(sanitiseHighlights([])).toEqual([]);
  });

  it("drops blank cards, replaces unknown icons and caps lengths", () => {
    const out = sanitiseHighlights([
      { icon: "truck", title: " Fast ", body: " Very fast " },
      { icon: "truck", title: "", body: "   " },
      { icon: "<script>", title: "x".repeat(99), body: "ok" },
      { icon: "gift", title: "4", body: "" },
      { icon: "gift", title: "5th card", body: "never shown" },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ icon: "truck", title: "Fast", body: "Very fast" });
    expect(out[1].icon).toBe("badge");
    expect(out[1].title).toHaveLength(HIGHLIGHT_TITLE_MAX);
    expect(out.map((h) => h.title)).not.toContain("5th card");
  });
});

describe("deliveryNoteFromOptions", () => {
  it("writes the card from the live delivery options", () => {
    const note = deliveryNoteFromOptions(
      [
        { name: "Inside Dhaka", feePaisa: 5000, minDays: 1, maxDays: 3 },
        { name: "Outside Dhaka", feePaisa: 10000, minDays: 2, maxDays: 5 },
      ],
      formatTaka,
    );
    expect(note).toBe(
      "Inside Dhaka ৳50 · 1–3 days. Outside Dhaka ৳100 · 2–5 days. Cash on delivery on every order.",
    );
    expect(note).not.toMatch(/suburb|threshold/i);
  });

  it("says free and handles a single-day option", () => {
    expect(
      deliveryNoteFromOptions([{ name: "Pickup", feePaisa: 0, minDays: 1, maxDays: 1 }], formatTaka),
    ).toBe("Pickup free · 1 day. Cash on delivery on every order.");
  });
});
