import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { getProductDetails } from "@/lib/commerce/products/service";
import { getAmazonProductTypeDefinition } from "@/lib/platforms/amazon/client";
import { fetchAmazonProductTypeSchema } from "@/lib/platforms/amazon/schema-fetch";
import { getMissingAmazonRequiredAttributes, summarizeAmazonListingSchema } from "@/lib/platforms/amazon/schema";
import { resolveAmazonCatalogIdentity, searchAmazonCatalogByIdentifier } from "@/lib/platforms/amazon/catalog";
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
    const productType = body.productType.trim();
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

    const definition = await getAmazonProductTypeDefinition(body.channelId, productType, { sellerId, requirements: "LISTING_OFFER_ONLY" });
    const schemaDocument = await fetchAmazonProductTypeSchema(definition.data);
    const initialSummary = summarizeAmazonListingSchema(schemaDocument, body.amazonAttributes);
    const suppliedAsin = typeof body.amazonAttributes?.merchant_suggested_asin === "string" ? body.amazonAttributes.merchant_suggested_asin.trim() : "";

    let resolvedAsin: string | null = null;
    let identityResolution: { identifierType: string; productType: string | null; requestId: string | null; rateLimit: string | null } | null = null;
    if (suppliedAsin) {
      const asinResult = await searchAmazonCatalogByIdentifier(body.channelId, suppliedAsin, "ASIN");
      const match = asinResult.items.find((item) => item.asin.trim().toUpperCase() === suppliedAsin.toUpperCase() && item.productType?.trim().toUpperCase() === productType.toUpperCase());
      if (!match) {
        return NextResponse.json({ success: false, error: `Amazon ASIN ${suppliedAsin} was not found for product type ${productType}. Verify the ASIN belongs to the selected Amazon product type.`, validationPreview: true, product: { id: product.id }, variant: { id: variant.id, sku: variant.sku }, productType, schemaSummary: initialSummary, missingAttributes: getMissingAmazonRequiredAttributes(initialSummary, body.amazonAttributes), identityResolution: null }, { status: 422 });
      }
      resolvedAsin = match.asin;
      identityResolution = { identifierType: "ASIN", productType: match.productType ?? null, requestId: asinResult.requestId, rateLimit: asinResult.rateLimit };
    } else if (variant.barcode?.trim()) {
      const identity = await resolveAmazonCatalogIdentity(body.channelId, variant.barcode, productType);
      if (identity?.asin) {
        resolvedAsin = identity.asin;
        identityResolution = { identifierType: identity.identifierType, productType: identity.productType, requestId: identity.requestId, rateLimit: identity.rateLimit };
      }
    }

    const draft = buildAmazonOfferDraft({ sku: variant.sku, productType, price: Number(body.price), mrp: variant.mrp, quantity: Number(body.quantity), condition: body.condition as AmazonOfferCondition, fulfillmentChannelCode: body.fulfillmentChannelCode as AmazonOfferFulfillment, asin: resolvedAsin, barcode: typeof variant.barcode === "string" ? variant.barcode : null, attributes: body.amazonAttributes, schemaSummary: initialSummary });
    const schemaSummary = summarizeAmazonListingSchema(schemaDocument, draft.attributes);
    const missing = getMissingAmazonRequiredAttributes(schemaSummary, draft.attributes);

    if (schemaSummary?.properties.merchant_suggested_asin && !resolvedAsin) {
      return NextResponse.json({ success: false, requiresAmazonAttributes: true, error: "Amazon catalog identity is required. Enter the ASIN that belongs to the selected Amazon product type.", product: { id: product.id }, variant: { id: variant.id, sku: variant.sku }, productType: draft.productType, requirements: draft.requirements, validationPreview: true, draft, schemaSummary, missingAttributes: missing, identityResolution }, { status: 200 });
    }

    const result = await previewAmazonOffer(body.channelId, sellerId, draft);
    const amazon = result.data;
    const issues = Array.isArray(amazon?.issues) ? amazon.issues : [];
    const invalid = String(amazon?.status ?? "").toUpperCase() === "INVALID";
    return NextResponse.json({ success: !invalid && issues.length === 0, product: { id: product.id }, variant: { id: variant.id, sku: variant.sku }, productType: draft.productType, requirements: draft.requirements, validationPreview: true, draft, schemaSummary, missingAttributes: missing, identityResolution, amazon, requestId: result.requestId, rateLimit: result.rateLimit }, { status: invalid || issues.length > 0 ? 422 : 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Amazon offer validation preview failed" }, { status: 502 });
  }
}
