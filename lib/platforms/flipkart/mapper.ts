export interface FlipkartVariantMappingInput {
  variantId: string;
  sku: string;
  price?: number | string | null;
  inventory?: number | null;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface FlipkartProductMappingInput {
  productId: string;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  brand?: string | null;
  images?: string[];
  attributes?: Record<string, string | number | boolean | null>;
  variants: FlipkartVariantMappingInput[];
}

export interface FlipkartDraftMapping {
  provider: "flipkart";
  mode: "draft";
  productId: string;
  title: string;
  description?: string;
  categoryId?: string;
  brand?: string;
  images: string[];
  attributes: Record<string, string | number | boolean>;
  variants: Array<{
    variantId: string;
    sku: string;
    price?: string;
    inventory?: number;
    attributes: Record<string, string | number | boolean>;
  }>;
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeAttributes(
  input: Record<string, string | number | boolean | null> | undefined,
) {
  const output: Record<string, string | number | boolean> = {};

  for (const [rawName, rawValue] of Object.entries(input ?? {})) {
    const name = rawName.trim();
    if (!name || rawValue === null || rawValue === undefined) continue;

    if (typeof rawValue === "string") {
      const value = rawValue.trim();
      if (value) output[name] = value;
      continue;
    }

    output[name] = rawValue;
  }

  return output;
}

function normalizePrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Flipkart draft price must be a non-negative number");
  }

  return parsed.toFixed(2);
}

function normalizeInventory(value: number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Flipkart draft inventory must be a non-negative integer");
  }
  return value;
}

export function buildFlipkartDraftMapping(
  input: FlipkartProductMappingInput,
): FlipkartDraftMapping {
  const title = input.title.trim();
  if (!title) throw new Error("Flipkart draft title is required");

  const productId = input.productId.trim();
  if (!productId) throw new Error("Flipkart draft product ID is required");

  const variants = input.variants ?? [];
  if (variants.length === 0) {
    throw new Error("Flipkart draft requires at least one variant");
  }

  const seenSkus = new Set<string>();
  const mappedVariants = variants.map((variant) => {
    const variantId = variant.variantId.trim();
    const sku = variant.sku.trim();

    if (!variantId) throw new Error("Flipkart draft variant ID is required");
    if (!sku) throw new Error("Flipkart draft SKU is required");

    if (seenSkus.has(sku)) {
      throw new Error(`Duplicate Flipkart draft SKU: ${sku}`);
    }
    seenSkus.add(sku);

    const price = normalizePrice(variant.price);
    const inventory = normalizeInventory(variant.inventory);

    return {
      variantId,
      sku,
      ...(price !== undefined ? { price } : {}),
      ...(inventory !== undefined ? { inventory } : {}),
      attributes: normalizeAttributes(variant.attributes),
    };
  });

  const images = (input.images ?? [])
    .map((image) => image.trim())
    .filter(Boolean);

  return {
    provider: "flipkart",
    mode: "draft",
    productId,
    title,
    ...(normalizeText(input.description) ? { description: normalizeText(input.description) } : {}),
    ...(normalizeText(input.categoryId) ? { categoryId: normalizeText(input.categoryId) } : {}),
    ...(normalizeText(input.brand) ? { brand: normalizeText(input.brand) } : {}),
    images,
    attributes: normalizeAttributes(input.attributes),
    variants: mappedVariants,
  };
}
