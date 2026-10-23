import { describe, it, expect } from "vitest";
import { newVariantSku, parseVariantRows, variantName } from "@/lib/catalog/variants";

describe("variantName", () => {
  it("joins size and colour", () => {
    expect(variantName("M", "")).toBe("M");
    expect(variantName("", "Black")).toBe("Black");
    expect(variantName(" XL ", "Navy Blue")).toBe("XL / Navy Blue");
  });
});

describe("newVariantSku", () => {
  it("builds PRODUCT-SIZE-COLOUR and never repeats one", () => {
    const used = new Set(["SHIRT1-M"]);
    expect(newVariantSku("shirt1", "M", "", 0, used)).toBe("SHIRT1-M-2");
    expect(newVariantSku("shirt1", "XL", "Navy Blue", 1, used)).toBe("SHIRT1-XL-NAVYBLUE");
    // Bangla-only names have no Latin letters: fall back to the position.
    expect(newVariantSku("shirt1", "বড়", "", 4, used)).toBe("SHIRT1-V5");
  });
});

describe("parseVariantRows", () => {
  it("accepts sizes with stock and an optional price", () => {
    const r = parseVariantRows(
      JSON.stringify([
        { id: "", size: "M", color: "", stock: 3, price: "", active: true },
        { size: "L", color: "Black", stock: "2", price: "650", active: false },
      ]),
    );
    expect("rows" in r && r.rows.map((x) => [x.size, x.stock, x.price, x.active])).toEqual([
      ["M", 3, "", true],
      ["L", 2, 650, false],
    ]);
  });

  it("refuses duplicates, empty rows, negative stock and a zero price", () => {
    expect(parseVariantRows(JSON.stringify([{ size: "M", stock: 1 }, { size: "m", stock: 2 }]))).toEqual({
      error: '"m" is listed twice.',
    });
    expect("error" in parseVariantRows(JSON.stringify([{ size: "", color: "", stock: 1 }]))).toBe(true);
    expect("error" in parseVariantRows(JSON.stringify([{ size: "S", stock: -1 }]))).toBe(true);
    expect("error" in parseVariantRows(JSON.stringify([{ size: "S", stock: 1, price: "0" }]))).toBe(true);
    expect("error" in parseVariantRows("not json")).toBe(true);
  });
});
