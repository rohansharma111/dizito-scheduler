"use client";

import { useEffect, useState } from "react";

interface Variant { id: string | number; name?: string | null; sku?: string | null; price?: number | null; }
interface Channel { id: string; provider: string; status: string; }
interface ProductType { name: string; displayName: string; }
interface Props { productId: string; }
interface ValidationResult { status?: string; submissionId?: string; issues?: Array<{ code?: string; message?: string; attributeName?: string } | string>; }
type Condition = "new_new" | "used_like_new" | "used_very_good" | "used_good" | "used_acceptable";
type Fulfillment = "DEFAULT" | "AMAZON_IN";

function displayIssue(issue: { code?: string; message?: string; attributeName?: string } | string) {
  if (typeof issue === "string") return issue;
  return [issue.code, issue.attributeName, issue.message].filter(Boolean).join(" · ");
}

export default function AmazonOfferLayer({ productId }: Props) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [productType, setProductType] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantId, setVariantId] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [condition, setCondition] = useState<Condition>("new_new");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("DEFAULT");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Loading Amazon offer context…");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [channelResponse, productResponse] = await Promise.all([
          fetch("/api/commerce/channels"),
          fetch(`/api/products/${encodeURIComponent(productId)}`),
        ]);
        const channelData = (await channelResponse.json()) as { channels?: Channel[] };
        const productData = (await productResponse.json()) as { success?: boolean; product?: { name?: string; variants?: Variant[] }; error?: string };
        if (!channelResponse.ok) throw new Error("Unable to load commerce channels");
        if (!productResponse.ok || !productData.success) throw new Error(productData.error || "Unable to load product variants");
        const amazon = channelData.channels?.find((item) => item.provider === "amazon" && item.status === "active") ?? null;
        const nextVariants = productData.product?.variants ?? [];
        if (!amazon) throw new Error("No active Amazon channel connected");
        if (!cancelled) {
          setChannel(amazon);
          setVariants(nextVariants);
          if (nextVariants.length === 1) {
            setVariantId(String(nextVariants[0].id));
            if (nextVariants[0].price != null) setPrice(String(nextVariants[0].price));
          }
          const typeResponse = await fetch("/api/commerce/amazon/product-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: amazon.id, productId }) });
          const typeData = (await typeResponse.json()) as { success?: boolean; productTypes?: ProductType[]; error?: string };
          if (!typeResponse.ok || !typeData.success) throw new Error(typeData.error || "Unable to load Amazon product types");
          setProductTypes(typeData.productTypes ?? []);
          setStatus("Amazon offer context loaded");
        }
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Unable to load Amazon offer context");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [productId]);

  function selectVariant(value: string) {
    setVariantId(value);
    const variant = variants.find((item) => String(item.id) === value);
    if (variant?.price != null) setPrice(String(variant.price));
    setValidation(null);
    setDraftSaved(false);
  }

  async function saveDraft(): Promise<boolean> {
    if (!channel || !variantId || !productType || !validation || (validation.issues?.length ?? 0) > 0) return false;
    const listingsResponse = await fetch("/api/commerce/listings");
    const listingsData = (await listingsResponse.json()) as { success?: boolean; listings?: Array<{ channel_id?: string; product_id?: string | number; provider_metadata?: Record<string, unknown> }>; error?: string };
    if (!listingsResponse.ok || !listingsData.success) throw new Error(listingsData.error || "Unable to load existing Commerce listing draft");
    const existing = listingsData.listings?.find((listing) => String(listing.channel_id) === channel.id && String(listing.product_id) === String(productId));
    const existingAmazon = existing?.provider_metadata?.amazon;
    const existingProduct = existingAmazon && typeof existingAmazon === "object" && !Array.isArray(existingAmazon) ? (existingAmazon as Record<string, unknown>).product : undefined;
    if (!existing || !existingProduct) throw new Error("Select an Amazon catalog ASIN first so the product identity is saved before the offer draft");

    const response = await fetch("/api/commerce/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: channel.id,
        productId,
        providerMetadata: {
          amazon: {
            product: { productType },
            offer: { variantId, price: Number(price), quantity: Number(quantity), condition, fulfillmentChannelCode: fulfillment, validation: { status: validation.status ?? null, submissionId: validation.submissionId ?? null } },
          },
        },
        variants: [{ variantId }],
      }),
    });
    const data = (await response.json()) as { success?: boolean; error?: string };
    if (!response.ok || !data.success) throw new Error(data.error || "Unable to save Amazon listing draft");
    setDraftSaved(true);
    return true;
  }

  async function validateOffer() {
    if (!channel) return;
    if (!productType) { setStatus("Select an Amazon product type."); return; }
    if (!variantId) { setStatus("Select a product variant."); return; }
    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) { setStatus("Enter a positive offer price."); return; }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) { setStatus("Enter a non-negative integer quantity."); return; }
    setLoading(true);
    setValidation(null);
    setDraftSaved(false);
    setStatus("Sending Amazon offer validation preview…");
    try {
      const response = await fetch("/api/commerce/amazon/offer-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id, productId, variantId, productType, price: parsedPrice, quantity: parsedQuantity, condition, fulfillmentChannelCode: fulfillment }),
      });
      const data = (await response.json()) as { success?: boolean; amazon?: ValidationResult; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Amazon offer validation failed");
      setValidation(data.amazon ?? null);
      const count = data.amazon?.issues?.length ?? 0;
      if (count === 0) {
        const saved = await saveDraft();
        setStatus(saved ? "Amazon offer validated and Commerce listing draft saved" : "Amazon offer validation returned no issues");
      } else {
        setStatus(`Amazon offer validation returned ${count} issue${count === 1 ? "" : "s"}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Amazon offer validation failed");
    } finally { setLoading(false); }
  }

  return <section className="bg-white border rounded-xl p-6">
    <div className="mb-5"><h2 className="text-lg font-semibold">Amazon Offer</h2><p className="text-sm text-gray-500 mt-1">Configure seller-specific price, inventory, condition, and fulfillment. This validates the offer and, when a catalog identity draft exists, saves the configuration to the durable Commerce listing draft. It does not publish.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Amazon product type</label><select value={productType} onChange={(event) => { setProductType(event.target.value); setValidation(null); setDraftSaved(false); }} className="border rounded-lg px-3 py-2 w-full bg-white"><option value="">Select Amazon product type</option>{productTypes.map((item) => <option key={item.name} value={item.name}>{item.displayName} ({item.name})</option>)}</select></div>
      <div><label className="block text-sm font-medium mb-1">Variant</label><select value={variantId} onChange={(event) => selectVariant(event.target.value)} className="border rounded-lg px-3 py-2 w-full bg-white"><option value="">Select variant</option>{variants.map((variant) => <option key={String(variant.id)} value={String(variant.id)}>{variant.name || variant.sku || `Variant ${variant.id}`}{variant.sku ? ` · ${variant.sku}` : ""}</option>)}</select></div>
      <div><label className="block text-sm font-medium mb-1">Offer price (INR)</label><input type="number" min="0.01" step="0.01" value={price} onChange={(event) => { setPrice(event.target.value); setValidation(null); setDraftSaved(false); }} className="border rounded-lg px-3 py-2 w-full" placeholder="Enter selling price" /></div>
      <div><label className="block text-sm font-medium mb-1">Available quantity</label><input type="number" min="0" step="1" value={quantity} onChange={(event) => { setQuantity(event.target.value); setValidation(null); setDraftSaved(false); }} className="border rounded-lg px-3 py-2 w-full" /></div>
      <div><label className="block text-sm font-medium mb-1">Condition</label><select value={condition} onChange={(event) => { setCondition(event.target.value as Condition); setValidation(null); setDraftSaved(false); }} className="border rounded-lg px-3 py-2 w-full bg-white"><option value="new_new">New</option><option value="used_like_new">Used — Like New</option><option value="used_very_good">Used — Very Good</option><option value="used_good">Used — Good</option><option value="used_acceptable">Used — Acceptable</option></select></div>
      <div><label className="block text-sm font-medium mb-1">Fulfillment</label><select value={fulfillment} onChange={(event) => { setFulfillment(event.target.value as Fulfillment); setValidation(null); setDraftSaved(false); }} className="border rounded-lg px-3 py-2 w-full bg-white"><option value="DEFAULT">Seller fulfilled</option><option value="AMAZON_IN">Amazon fulfillment</option></select></div>
    </div>
    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap"><p className="text-sm text-gray-500">{status}</p><button type="button" onClick={validateOffer} disabled={loading || variants.length === 0} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">{loading ? "Validating…" : "Validate Offer with Amazon"}</button></div>
    {draftSaved && <p className="mt-3 text-sm text-green-700">Commerce listing draft saved. No Amazon listing was published.</p>}
    {validation && <div className="mt-6 border-t pt-5"><h3 className="font-medium">Amazon offer validation result</h3><p className="text-sm text-gray-600 mt-2">Status: <span className="font-medium">{validation.status || "returned"}</span>{validation.submissionId ? ` · Submission ${validation.submissionId}` : ""}</p>{validation.issues && validation.issues.length > 0 ? <div className="mt-3 space-y-2">{validation.issues.map((issue, index) => <div key={index} className="border rounded-lg p-3 text-sm">{displayIssue(issue)}</div>)}</div> : <p className="text-sm text-gray-600 mt-3">Amazon returned no offer validation issues.</p>}</div>}
  </section>;
}
