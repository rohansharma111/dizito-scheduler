"use client";

import { useEffect, useState } from "react";

interface Variant { id: string | number; name?: string | null; sku?: string | null; price?: number | null; }
interface Props { channelId: string; productId: string; productType: string; }
interface ValidationResult { status?: string; submissionId?: string; issues?: Array<{ code?: string; message?: string; attributeName?: string } | string>; }

type Condition = "new_new" | "used_like_new" | "used_very_good" | "used_good" | "used_acceptable";
type Fulfillment = "DEFAULT" | "AMAZON_IN";

function displayIssue(issue: ValidationResult["issues"] extends Array<infer T> ? T : never) {
  if (typeof issue === "string") return issue;
  return [issue.code, issue.attributeName, issue.message].filter(Boolean).join(" · ");
}

export default function AmazonOfferLayer({ channelId, productId, productType }: Props) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantId, setVariantId] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [condition, setCondition] = useState<Condition>("new_new");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("DEFAULT");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(productId)}`);
        const data = (await response.json()) as { success?: boolean; product?: { variants?: Variant[] }; error?: string };
        if (!response.ok || !data.success) throw new Error(data.error || "Unable to load product variants");
        const nextVariants = data.product?.variants ?? [];
        if (!cancelled) {
          setVariants(nextVariants);
          if (nextVariants.length === 1) {
            setVariantId(String(nextVariants[0].id));
            if (nextVariants[0].price != null) setPrice(String(nextVariants[0].price));
          }
        }
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Unable to load product variants");
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
  }

  async function validateOffer() {
    if (!variantId) { setStatus("Select a product variant."); return; }
    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) { setStatus("Enter a positive offer price."); return; }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) { setStatus("Enter a non-negative integer quantity."); return; }

    setLoading(true);
    setValidation(null);
    setStatus("Sending Amazon offer validation preview…");
    try {
      const response = await fetch("/api/commerce/amazon/offer-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          productId,
          variantId,
          productType,
          price: parsedPrice,
          quantity: parsedQuantity,
          condition,
          fulfillmentChannelCode: fulfillment,
        }),
      });
      const data = (await response.json()) as { success?: boolean; amazon?: ValidationResult; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Amazon offer validation failed");
      setValidation(data.amazon ?? null);
      const count = data.amazon?.issues?.length ?? 0;
      setStatus(count === 0 ? "Amazon offer validation returned no issues" : `Amazon offer validation returned ${count} issue${count === 1 ? "" : "s"}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Amazon offer validation failed");
    } finally {
      setLoading(false);
    }
  }

  return <section className="mt-6 border-t pt-6">
    <div className="mb-4">
      <h3 className="text-lg font-semibold">Amazon Offer</h3>
      <p className="text-sm text-gray-500 mt-1">Configure seller-specific price, inventory, condition, and fulfillment for the selected Amazon product. This only validates the offer; it does not publish it.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="block text-sm font-medium mb-1">Variant</label>
        <select value={variantId} onChange={(event) => selectVariant(event.target.value)} className="border rounded-lg px-3 py-2 w-full bg-white">
          <option value="">Select variant</option>
          {variants.map((variant) => <option key={String(variant.id)} value={String(variant.id)}>{variant.name || variant.sku || `Variant ${variant.id}`}{variant.sku ? ` · ${variant.sku}` : ""}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Offer price (INR)</label>
        <input type="number" min="0.01" step="0.01" value={price} onChange={(event) => { setPrice(event.target.value); setValidation(null); }} className="border rounded-lg px-3 py-2 w-full" placeholder="Enter selling price" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Available quantity</label>
        <input type="number" min="0" step="1" value={quantity} onChange={(event) => { setQuantity(event.target.value); setValidation(null); }} className="border rounded-lg px-3 py-2 w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Condition</label>
        <select value={condition} onChange={(event) => { setCondition(event.target.value as Condition); setValidation(null); }} className="border rounded-lg px-3 py-2 w-full bg-white">
          <option value="new_new">New</option>
          <option value="used_like_new">Used — Like New</option>
          <option value="used_very_good">Used — Very Good</option>
          <option value="used_good">Used — Good</option>
          <option value="used_acceptable">Used — Acceptable</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Fulfillment</label>
        <select value={fulfillment} onChange={(event) => { setFulfillment(event.target.value as Fulfillment); setValidation(null); }} className="border rounded-lg px-3 py-2 w-full bg-white">
          <option value="DEFAULT">Seller fulfilled</option>
          <option value="AMAZON_IN">Amazon fulfillment</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">The channel code is kept explicit so marketplace-specific fulfillment mapping can evolve independently.</p>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
      <p className="text-sm text-gray-500">{status}</p>
      <button type="button" onClick={validateOffer} disabled={loading || variants.length === 0} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">{loading ? "Validating…" : "Validate Offer with Amazon"}</button>
    </div>
    {validation && <div className="mt-5 border-t pt-4">
      <h4 className="font-medium">Amazon offer validation result</h4>
      <p className="text-sm text-gray-600 mt-2">Status: <span className="font-medium">{validation.status || "returned"}</span>{validation.submissionId ? ` · Submission ${validation.submissionId}` : ""}</p>
      {validation.issues && validation.issues.length > 0 ? <div className="mt-3 space-y-2">{validation.issues.map((issue, index) => <div key={index} className="border rounded-lg p-3 text-sm">{displayIssue(issue)}</div>)}</div> : <p className="text-sm text-gray-600 mt-3">Amazon returned no offer validation issues.</p>}
    </div>}
  </section>;
}
