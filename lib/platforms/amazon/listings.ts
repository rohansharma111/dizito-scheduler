import { getAmazonMarketplaceId } from "@/lib/platforms/amazon/auth";
import { amazonSpApiRequest } from "@/lib/platforms/amazon/client";

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

interface AmazonListingsItemResponse {
  sku?: string;
  status?: string;
  submissionId?: string;
  issues?: unknown[];
}

export async function previewAmazonListing(
  channelId: string,
  sellerId: string,
  draft: AmazonListingDraft,
) {
  return amazonSpApiRequest<AmazonListingsItemResponse>(channelId, {
    method: "PUT",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(draft.sku)}`,
    query: {
      marketplaceIds: getAmazonMarketplaceId(),
      issueLocale: "en_IN",
      mode: "VALIDATION_PREVIEW",
    },
    body: {
      productType: draft.productType,
      requirements: draft.requirements,
      attributes: draft.attributes,
    },
  });
}
