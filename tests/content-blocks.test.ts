import { describe, it, expect } from "vitest";
import { inlineRuns, sanitiseBlocks } from "@/lib/content/blocks";

describe("inlineRuns", () => {
  it("reads toolbar markers and WhatsApp-style bold", () => {
    expect(inlineRuns("a **b** *c* __d__ [red]e[/red]")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " " },
      { text: "c", bold: true },
      { text: " " },
      { text: "d", underline: true },
      { text: " " },
      { text: "e", color: "red" },
    ]);
  });

  it("leaves arithmetic and unmatched tags alone", () => {
    expect(inlineRuns("5 * 3 * 2")).toEqual([{ text: "5 * 3 * 2" }]);
    expect(inlineRuns("[blue]x[/red]")).toEqual([{ text: "[blue]x[/red]" }]);
  });
});

describe("sanitiseBlocks", () => {
  it("keeps title alignment, colour and icon, and drops anything unknown", () => {
    expect(
      sanitiseBlocks([
        { type: "heading", text: " Returns ", align: "center", color: "blue", icon: "return" },
        { type: "subheading", text: "Note", align: "right", color: "toString", icon: "rocket" },
        { type: "script", text: "<x>" },
      ]),
    ).toEqual([
      { type: "heading", text: "Returns", align: "center", color: "blue", icon: "return" },
      { type: "subheading", text: "Note" },
    ]);
  });
});
