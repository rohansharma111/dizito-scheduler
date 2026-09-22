"use client";

import { useState } from "react";

type Scenario = "valid" | "missing-required" | "catalog-mismatch" | "amazon-invalid";

export default function AmazonValidationMockPage() {
  const [scenario, setScenario] = useState<Scenario>("valid");
  const [productType, setProductType] = useState("ABRASIVE_SHEETS");
  const [asin, setAsin] = useState("B0H4QHXSW2");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/commerce/amazon/offer-preview/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, productType, asin }),
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
        <p className="mt-2 text-sm text-gray-600">
          Local-only validation scenarios. This page never calls Amazon and never creates a listing.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border p-5">
        <label className="block text-sm font-medium">
          Scenario
          <select className="mt-1 block w-full rounded-lg border px-3 py-2" value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>
            <option value="valid">Valid response</option>
            <option value="missing-required">Missing required attributes</option>
            <option value="catalog-mismatch">Catalog/product-type mismatch (8541)</option>
            <option value="amazon-invalid">Invalid offer values (90183)</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Amazon product type
          <input className="mt-1 block w-full rounded-lg border px-3 py-2" value={productType} onChange={(event) => setProductType(event.target.value)} />
        </label>

        <label className="block text-sm font-medium">
          ASIN
          <input className="mt-1 block w-full rounded-lg border px-3 py-2" value={asin} onChange={(event) => setAsin(event.target.value)} />
        </label>

        <button type="button" disabled={loading} onClick={run} className="rounded-lg border px-4 py-2 font-medium disabled:opacity-50">
          {loading ? "Running…" : "Run mock validation"}
        </button>
      </section>

      {result !== null && (
        <section className="rounded-xl border p-5">
          <h2 className="font-semibold">Response</h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
