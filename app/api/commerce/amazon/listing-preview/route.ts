import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { getProductDetails } from "@/lib/commerce/products/service";
import { buildAmazonListingDraft, previewAmazonListing, type AmazonListingFieldMapping } from "@/lib/platforms/amazon/listings";
import { getAmazonProductTypeDefinition } from "@/lib/platforms/amazon/client";
import { fetchAmazonProductTypeSchema } from "@/lib/platforms/amazon/schema-fetch";
import { summarizeAmazonListingSchema } from "@/lib/platforms/amazon/schema";

interface ProductVariantForListingPreview { id: string | number; sku?: string | null; barcode?: string | null; price?: number | null; }
interface ProductForListingPreview { id: string | number; name: string; description?: string | null; brand?: string | null; category?: string | null; variants: ProductVariantForListingPreview[]; }

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { channelId?: string; productId?: string; variantId?: string; productType?: string; fieldMappings?: Record<string, AmazonListingFieldMapping>; };
    if (!body.channelId || !body.productId || !body.productType?.trim()) {
      return NextResponse.json({ success: false, error: "channelId, productId, and productType are required" }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const channel = await getCommerceChannelById(body.channelId, userId);
    if (!channel || channel.provider !== "amazon") return NextResponse.json({ success: false, error: "Amazon channel not found" }, { status: 404 });
    if (channel.status !== "active") return NextResponse.json({ success: false, error: `Amazon channel is not active (status: ${channel.status})` }, { status: 409 });

    const sellerId = String(channel.external_account_id ?? "").trim();
    if (!sellerId) return NextResponse.json({ success: false, error: "Amazon seller ID is missing from the channel" }, { status: 409 });

    const product = (await getProductDetails(body.productId, userId)) as ProductForListingPreview | null;
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    const variant = body.variantId
      ? product.variants.find((item) => String(item.id) === body.variantId)
      : product.variants.length === 1 ? product.variants[0] : undefined;
    if (!variant) return NextResponse.json({ success: false, error: product.variants.length > 1 ? "variantId is required when a product has multiple variants" : "Product must have at least one variant" }, { status: 409 });
    if (!variant.sku?.trim()) return NextResponse.json({ success: false, error: "The selected variant must have a SKU" }, { status: 409 });

    const draft = buildAmazonListingDraft(
      { name: product.name, description: product.description, brand: product.brand, category: product.category },
      { sku: variant.sku, barcode: variant.barcode, price: variant.price },
      body.productType.trim(),
      body.fieldMappings ?? {},
      "LISTING_PRODUCT_ONLY",
    );

    // Amazon rejects parentageLevel when requirements=LISTING_PRODUCT_ONLY.
    // Let the product-type schema retain its conditional variation logic.
    const definition = await getAmazonProductTypeDefinition(body.channelId, body.productType.trim(), {
      sellerId,
      requirements: "LISTING_PRODUCT_ONLY",
    });
    const schemaDocument = await fetchAmazonProductTypeSchema(definition.data);
    const schemaSummary = summarizeAmazonListingSchema(schemaDocument, draft.attributes);

    const result = await previewAmazonListing(body.channelId, sellerId, draft);
    return NextResponse.json({
      success: true,
      product: { id: product.id, name: product.name },
      variant: { id: variant.id, sku: variant.sku },
      productType: draft.productType,
      requirements: draft.requirements,
      validationPreview: true,
      draft,
      schemaSummary,
      amazon: result.data,
      requestId: result.requestId,
      rateLimit: result.rateLimit,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Amazon listing validation preview failed" }, { status: 502 });
  }
}
