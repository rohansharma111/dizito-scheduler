import { describe, expect, it } from "vitest";
import {
  buildWooCommerceProductPayload,
  buildWooCommerceVariationPayload,
} from "./mapper";

describe("buildWooCommerceProductPayload", () => {
  it("creates a draft simple product and normalizes values", () => {
    expect(
      buildWooCommerceProductPayload({
        name: "  Demo Product  ",
        description: "  Long description  ",
        shortDescription: " Short description ",
        sku: " SKU-1 ",
        price: "19.5",
        stockQuantity: 4,
        manageStock: true,
        images: [" https://example.com/image.jpg ", "  "],
        categories: [" Apparel ", ""],
      }),
    ).toEqual({
      name: "Demo Product",
      type: "simple",
      status: "draft",
      description: "Long description",
      short_description: "Short description",
      sku: "SKU-1",
      regular_price: "19.50",
      stock_quantity: 4,
      manage_stock: true,
      images: [{ src: "https://example.com/image.jpg" }],
      categories: [{ name: "Apparel" }],
    });
  });

  it("creates variable-product attributes from variant values", () => {
    expect(
      buildWooCommerceProductPayload({
        name: "T-Shirt",
        variants: [
          { attributes: { Size: "S", Color: "Red" } },
          { attributes: { Size: "M", Color: "Red" } },
          { attributes: { Size: "S", Color: "Blue" } },
        ],
      }),
    ).toEqual({
      name: "T-Shirt",
      type: "variable",
      status: "draft",
      attributes: [
        {
          name: "Size",
          visible: true,
          variation: true,
          options: ["S", "M"],
        },
        {
          name: "Color",
          visible: true,
          variation: true,
          options: ["Red", "Blue"],
        },
      ],
    });
  });

  it("rejects blank names, negative prices, and invalid stock", () => {
    expect(() => buildWooCommerceProductPayload({ name: "  " })).toThrow(
      "WooCommerce product name is required",
    );
    expect(() =>
      buildWooCommerceProductPayload({ name: "Product", price: -1 }),
    ).toThrow("WooCommerce price must be a non-negative number");
    expect(() =>
      buildWooCommerceProductPayload({ name: "Product", stockQuantity: 1.5 }),
    ).toThrow("WooCommerce stock quantity must be a non-negative integer");
  });
});

describe("buildWooCommerceVariationPayload", () => {
  it("normalizes variation fields and filters empty attributes", () => {
    expect(
      buildWooCommerceVariationPayload({
        sku: " VAR-1 ",
        price: 12,
        stockQuantity: 2,
        manageStock: true,
        imageUrl: " https://example.com/variant.jpg ",
        attributes: { Size: "M", Color: "", Material: null },
      }),
    ).toEqual({
      sku: "VAR-1",
      regular_price: "12.00",
      stock_quantity: 2,
      manage_stock: true,
      image: { src: "https://example.com/variant.jpg" },
      attributes: [{ name: "Size", option: "M" }],
    });
  });
});
