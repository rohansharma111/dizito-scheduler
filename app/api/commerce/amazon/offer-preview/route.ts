import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { getProductDetails } from "@/lib/commerce/products/service";
import { getProductListings } from "@/lib/commerce/listings/service";
import { getAmazonProductTypeDefinition } from "@/lib/platforms/amazon/client";
import { fetchAmazonProductTypeSchema } from "@/lib/platforms/amazon/schema-fetch";
import { getMissingAmazonRequiredAttributes, summarizeAmazonListingSchema } from "@/lib/platforms/amazon/schema";
import { buildAmazonOfferDraft, previewAmazonOffer, type AmazonOfferCondition, type AmazonOfferFulfillment } from "@/lib/platforms/amazon/offers";

interface ProductVariant { id: string | number; sku?: string | null; barcode?: string | null; price?: number | null; mrp?: number | null; }
interface Product { id: string | number; variants: ProductVariant[]; }

const conditions = new Set<AmazonOfferCondition>(["new_new", "used_like_new", "used_very_good", "used_good", "used_acceptable"]);
const fulfillmentChannels = new Set<AmazonOfferFulfillment>(["DEFAULT", "AMAZON_IN"]);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { channelId?: string; productId?: string; variantId?: string; productType?: string; price?: number; quantity?: number; condition?: string; fulfillmentChannelCode?: string; amazonAttributes?: Record<string, unknown> };
    if (!body.channelId || !body.productId || !body.productType?.trim()) return NextResponse.json({ success: false, error: "channelId, productId, and productType are required" }, { status: 400 });
    if (!Number.isFinite(body.price) || (body.price ?? 0) <= 0) return NextResponse.json({ success: false, error: "A positive offer price is required" }, { status: 400 });
    if (!Number.isInteger(body.quantity) || (body.quantity ?? -1) < 0) return NextResponse.json({ success: false, error: "Quantity must be a non-negative integer" }, { status: 400 });
    if (!conditions.has(body.condition as AmazonOfferCondition)) return NextResponse.json({ success: false, error: "Unsupported offer condition" }, { status: 400 });
    if (!fulfillmentChannels.has(body.fulfillmentChannelCode as AmazonOfferFulfillment)) return NextResponse.json({ success: false, error: "Unsupported fulfillment channel" }, { status: 400 });
    const userId = Number(session.user.id);
    const channel = await getCommerceChannelById(body.channelId, userId);
    if (!channel || channel.provider !== "amazon") return NextResponse.json({ success: false, error: "Amazon channel not found" }, { status: 404 });
    if (channel.status !== "active") return NextResponse.json({ success: false, error: `Amazon channel is not active (status: ${channel.status})` }, { status: 409 });
    const sellerId = String(channel.external_account_id ?? "").trim();
    if (!sellerId) return NextResponse.json({ success: false, error: "Amazon seller ID is missing from the channel" }, { status: 409 });
    const product = (await getProductDetails(body.productId, userId)) as Product | null;
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    const variant = body.variantId ? product.variants.find((item) => String(item.id) === body.variantId) : product.variants.length === 1 ? product.variants[0] : undefined;
    if (!variant) return NextResponse.json({ success: false, error: product.variants.length > 1 ? "variantId is required when a product has multiple variants" : "Product must have at least one variant" }, { status: 409 });
    if (!variant.sku?.trim()) return NextResponse.json({ success: false, error: "The selected variant must have a SKU" }, { status: 409 });

    const listings = await getProductListings(userId);
    const listing = listings.find((item) => String(item.channel_id) === String(body.channelId) && String(item.product_id) === String(body.productId));
    const amazonMetadata = listing?.provider_metadata?.amazon;
    const amazonProduct = amazonMetadata && typeof amazonMetadata === "object" && !Array.isArray(amazonMetadata) ? (amazonMetadata as Record<string, unknown>).product : undefined;
    const identity = amazonProduct && typeof amazonProduct === "object" && !Array.isArray(amazonProduct) ? (amazonProduct as Record<string, unknown>).identity : undefined;
    const asin = identity && typeof identity === "object" && !Array.isArray(identity) ? (identity as Record<string, unknown>).asin : undefined;

    // Amazon's definition/schema is the source of truth. Fetch it before constructing
    // the offer so selectors and nested shapes are emitted only when supported.
    const definition = await getAmazonProductTypeDefinition(body.channelId, body.productType, { sellerId, requirements: "LISTING_OFFER_ONLY" });
    const schemaDocument = await fetchAmazonProductTypeSchema(definition.data);
    const initialSummary = summarizeAmazonListingSchema(schemaDocument, body.amazonAttributes);

    const draft = buildAmazonOfferDraft({
      sku: variant.sku,
      productType: body.productType,
      price: Number(body.price),
      mrp: variant.mrp,
      quantity: Number(body.quantity),
      condition: body.condition as AmazonOfferCondition,
      fulfillmentChannelCode: body.fulfillmentChannelCode as AmazonOfferFulfillment,
      asin: typeof asin === "string" ? asin : null,
      barcode: typeof variant.barcode === "string" ? variant.barcode : null,
      attributes: body.amazonAttributes,
      schemaSummary: initialSummary,
    });

    const schemaSummary = summarizeAmazonListingSchema(schemaDocument, draft.attributes);
    const missing = getMissingAmazonRequiredAttributes(schemaSummary, draft.attributes);
    if (missing.length > 0) return NextResponse.json({ success: false, requiresAmazonAttributes: true, error: "Amazon requires additional attributes for this product type before offer validation can run.", productType: draft.productType, requirements: draft.requirements, draft, schemaSummary, missingAttributes: missing }, { status: 422 });

    const result = await previewAmazonOffer(body.channelId, sellerId, draft);
    return NextResponse.json({ success: true, product: { id: product.id }, variant: { id: variant.id, sku: variant.sku }, productType: draft.productType, requirements: draft.requirements, validationPreview: true, draft, schemaSummary, amazon: result.data, requestId: result.requestId, rateLimit: result.rateLimit });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Amazon offer validation preview failed" }, { status: 502 });
  }
}
