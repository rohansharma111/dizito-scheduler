export interface WooCommerceVariantInput {
  sku?: string | null;
  name?: string | null;
  price?: number | string | null;
  stockQuantity?: number | null;
  manageStock?: boolean;
  imageUrl?: string | null;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface WooCommerceProductInput {
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  status?: "draft" | "pending" | "private" | "publish";
  sku?: string | null;
  price?: number | string | null;
  stockQuantity?: number | null;
  manageStock?: boolean;
  images?: string[];
  categories?: string[];
  variants?: WooCommerceVariantInput[];
}

export interface WooCommerceProductPayload {
  name: string;
  type: "simple" | "variable";
  status: "draft" | "pending" | "private" | "publish";
  description?: string;
  short_description?: string;
  sku?: string;
  regular_price?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  images?: Array<{ src: string }>;
  categories?: Array<{ name: string }>;
  attributes?: Array<{
    name: string;
    visible: boolean;
    variation: boolean;
    options: string[];
  }>;
}

function normalizedPrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("WooCommerce price must be a non-negative number");
  }
  return parsed.toFixed(2);
}

function normalizedStock(value: number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("WooCommerce stock quantity must be a non-negative integer");
  }
  return value;
}

export function buildWooCommerceProductPayload(input: WooCommerceProductInput): WooCommerceProductPayload {
  const name = input.name.trim();
  if (!name) throw new Error("WooCommerce product name is required");

  const variants = input.variants ?? [];
  const payload: WooCommerceProductPayload = {
    name,
    type: variants.length ? "variable" : "simple",
    status: input.status ?? "draft",
  };

  if (input.description?.trim()) payload.description = input.description.trim();
  if (input.shortDescription?.trim()) payload.short_description = input.shortDescription.trim();
  if (input.sku?.trim()) payload.sku = input.sku.trim();

  const price = normalizedPrice(input.price);
  if (price !== undefined) payload.regular_price = price;

  const stock = normalizedStock(input.stockQuantity);
  if (stock !== undefined) payload.stock_quantity = stock;
  if (input.manageStock !== undefined) payload.manage_stock = input.manageStock;

  const images = (input.images ?? []).map((src) => src.trim()).filter(Boolean);
  if (images.length) payload.images = images.map((src) => ({ src }));

  const categories = (input.categories ?? []).map((name) => name.trim()).filter(Boolean);
  if (categories.length) payload.categories = categories.map((name) => ({ name }));

  if (variants.length) {
    const attributeMap = new Map<string, Set<string>>();
    for (const variant of variants) {
      for (const [name, value] of Object.entries(variant.attributes ?? {})) {
        if (value === null || value === undefined || value === "") continue;
        const values = attributeMap.get(name) ?? new Set<string>();
        values.add(String(value));
        attributeMap.set(name, values);
      }
    }
    if (attributeMap.size) {
      payload.attributes = [...attributeMap.entries()].map(([name, values]) => ({
        name,
        visible: true,
        variation: true,
        options: [...values],
      }));
    }
  }

  return payload;
}

export function buildWooCommerceVariationPayload(input: WooCommerceVariantInput) {
  const payload: Record<string, unknown> = {};
  if (input.sku?.trim()) payload.sku = input.sku.trim();

  const price = normalizedPrice(input.price);
  if (price !== undefined) payload.regular_price = price;

  const stock = normalizedStock(input.stockQuantity);
  if (stock !== undefined) payload.stock_quantity = stock;
  if (input.manageStock !== undefined) payload.manage_stock = input.manageStock;
  if (input.imageUrl?.trim()) payload.image = { src: input.imageUrl.trim() };

  const attributes = Object.entries(input.attributes ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([name, option]) => ({ name, option: String(option) }));
  if (attributes.length) payload.attributes = attributes;

  return payload;
}
