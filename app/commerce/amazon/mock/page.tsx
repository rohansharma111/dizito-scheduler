"use client";

import { useState } from "react";

type Scenario = "valid" | "missing-required" | "catalog-mismatch" | "amazon-invalid";

export default function AmazonValidationMockPage() {
  const [scenario, setScenario] = useState<Scenario>("valid");
  const [productType, setProductType] = useState("ABRASIVE_SHEETS");
  const [asin, setAsin] = useState("B0H4QHXSW2");
  const [hsn, setHsn] = useState("");
  const [externalIdType, setExternalIdType] = useState("ean");
  const [externalIdValue, setExternalIdValue] = useState("");
  const [price, setPrice] = useState("100");
  const [quantity, setQuantity] = useState("1");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const attributes = {
        external_product_information: hsn ? [{ value: hsn, marketplace_id: "A21TJRUUN4KGV" }] : undefined,
        externally_assigned_product_identifier: externalIdValue
          ? [{ type: externalIdType, value: externalIdValue, marketplace_id: "A21TJRUUN4KGV" }]
          : undefined,
      };
      const response = await fetch("/api/commerce/amazon/offer-preview/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, productType, asin, attributes, price: Number(price), quantity: Number(quantity) }),
      });
      setResult(await response.json());
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Amazon validation mock</h1>
        <p className="mt-2 text-sm text-gray-600">Local-only validation scenarios. This page never calls Amazon and never creates a listing.</p>
      </div>

      <section className="space-y-4 rounded-xl border p-5">
        <label className="block text-sm font-medium">Scenario
          <select className="mt-1 block w-full rounded-lg border px-3 py-2" value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>
            <option value="valid">Schema-aware validation</option>
            <option value="missing-required">Missing required attributes</option>
            <option value="catalog-mismatch">Catalog/product-type mismatch (8541)</option>
            <option value="amazon-invalid">Invalid offer values (90183)</option>
          </select>
        </label>

        <label className="block text-sm font-medium">Amazon product type
          <input className="mt-1 block w-full rounded-lg border px-3 py-2" value={productType} onChange={(event) => setProductType(event.target.value)} />
        </label>

        <label className="block text-sm font-medium">ASIN
          <input className="mt-1 block w-full rounded-lg border px-3 py-2" value={asin} onChange={(event) => setAsin(event.target.value)} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">HSN / external product information
            <input className="mt-1 block w-full rounded-lg border px-3 py-2" value={hsn} onChange={(event) => setHsn(event.target.value)} placeholder="Enter verified HSN" />
          </label>
          <label className="block text-sm font-medium">External ID type
            <select className="mt-1 block w-full rounded-lg border px-3 py-2" value={externalIdType} onChange={(event) => setExternalIdType(event.target.value)}>
              <option value="ean">EAN</option><option value="upc">UPC</option><option value="gtin">GTIN</option><option value="isbn">ISBN</option>
            </select>
          </label>
          <label className="block text-sm font-medium">External ID value
            <input className="mt-1 block w-full rounded-lg border px-3 py-2" value={externalIdValue} onChange={(event) => setExternalIdValue(event.target.value)} placeholder="Enter test identifier" />
          </label>
          <label className="block text-sm font-medium">Offer price
            <input type="number" className="mt-1 block w-full rounded-lg border px-3 py-2" value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">Quantity
            <input type="number" className="mt-1 block w-full rounded-lg border px-3 py-2" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
        </div>

        <button type="button" disabled={loading} onClick={run} className="rounded-lg border px-4 py-2 font-medium disabled:opacity-50">{loading ? "Running…" : "Run mock validation"}</button>
      </section>

      {result !== null && <section className="rounded-xl border p-5"><h2 className="font-semibold">Response</h2><pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(result, null, 2)}</pre></section>}
    </main>
  );
}
