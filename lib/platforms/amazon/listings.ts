import { getAmazonMarketplaceId } from "@/lib/platforms/amazon/auth";

export interface AmazonListingProductInput {
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
}

export interface AmazonListingVariantInput {
  sku: string;
  barcode?: string | null;
  price?: number | null;
}

export interface AmazonListingDraft {
  sku: string;
  productType: string;
  requirements: "LISTING";
  attributes: Record<string, unknown>;
}

function localizedValue(value: string, marketplaceId: string) {
  return [
    {
      value,
      marketplace_id: marketplaceId,
      language_tag: "en_IN",
    },
  ];
}

function marketplaceValue(value: string, marketplaceId: string) {
  return [
    {
      value,
      marketplace_id: marketplaceId,
    },
  ];
}

/**
 * Build the conservative portion of an Amazon listing payload that can be
 * derived directly from the canonical Dizito product model.
 *
 * Amazon product-type schemas are dynamic, so category-specific attributes,
 * variation relationships, identifiers, pricing, and fulfillment are not
 * guessed here. Those mappings are added only when the selected product type
 * definition explicitly supports them.
 */
export function buildAmazonListingDraft(
  product: AmazonListingProductInput,
  variant: AmazonListingVariantInput,
  productType: string,
): AmazonListingDraft {
  const marketplaceId = getAmazonMarketplaceId();
  const attributes: Record<string, unknown> = {
    item_name: localizedValue(product.name, marketplaceId),
  };

  if (product.brand?.trim()) {
    attributes.brand = localizedValue(product.brand.trim(), marketplaceId);
  }

  if (product.description?.trim()) {
    attributes.product_description = localizedValue(
      product.description.trim(),
      marketplaceId,
    );
  }

  if (product.category?.trim()) {
    attributes.item_type_keyword = marketplaceValue(
      product.category.trim(),
      marketplaceId,
    );
  }

  return {
    sku: variant.sku,
    productType: productType.trim(),
    requirements: "LISTING",
    attributes,
  };
}
