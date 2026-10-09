import { describe, expect, it } from "vitest";
import { validateExternalProductReferences } from "@/lib/marketing/externalProductReferences";

describe("validateExternalProductReferences", () => {
  it("accepts bounded WooCommerce product snapshots with HTTPS permalinks", () => {
    expect(validateExternalProductReferences([{
      id: 42,
      name: "Embroidered Tote Bag",
      sku: "TOTE-42",
      price: "24.00",
      stockStatus: "instock",
      permalink: "https://store.example/products/tote",
    }])).toBeNull();
  });

  it("allows an empty list and optional snapshot fields", () => {
    expect(validateExternalProductReferences([])).toBeNull();
    expect(validateExternalProductReferences([{ id: 1, name: "Bag" }])).toBeNull();
  });

  it("rejects missing, invalid, or oversized product references", () => {
    expect(validateExternalProductReferences(null)).toBe("Invalid external product references");
    expect(validateExternalProductReferences(Array.from({ length: 21 }, (_, i) => ({ id: i + 1, name: "Bag" })))).toBe("Invalid external product references");
    expect(validateExternalProductReferences([{ id: 0, name: "Bag" }])).toBe("Invalid external product reference");
    expect(validateExternalProductReferences([{ id: 1, name: "  " }])).toBe("Invalid external product reference");
    expect(validateExternalProductReferences([{ id: 1, name: "x".repeat(201) }])).toBe("Invalid external product reference");
  });

  it("rejects oversized fields and non-HTTPS product links", () => {
    expect(validateExternalProductReferences([{ id: 1, name: "Bag", sku: "x".repeat(201) }])).toBe("External product fields exceed allowed limits");
    expect(validateExternalProductReferences([{ id: 1, name: "Bag", permalink: "http://store.example/products/bag" }])).toBe("Invalid external product URL");
    expect(validateExternalProductReferences([{ id: 1, name: "Bag", permalink: "not a URL" }])).toBe("Invalid external product URL");
  });
});
