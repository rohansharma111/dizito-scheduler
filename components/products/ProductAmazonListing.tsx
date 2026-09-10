"use client";

import { useEffect, useState } from "react";

interface CommerceChannel {
  id: string;
  provider: string;
  name: string;
  status: string;
}

interface ProductTypeOption {
  name: string;
  displayName: string;
  marketplaceIds: string[];
}

interface SchemaSummary {
  required: string[];
  properties: Record<string, { title?: string; description?: string; type?: string; enum?: unknown[] }>;
}

interface Props {
  productId: string;
}

export default function ProductAmazonListing({ productId }: Props) {
  const [channel, setChannel] = useState<CommerceChannel | null>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [schema, setSchema] = useState<SchemaSummary | null>(null);
  const [status, setStatus] = useState("Loading Amazon channel…");
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/commerce/channels");
        const data = (await response.json()) as { channels?: CommerceChannel[] };
        const amazon = data.channels?.find((item) => item.provider === "amazon" && item.status === "active") ?? null;
        if (!cancelled) {
          setChannel(amazon);
          setStatus(amazon ? "Amazon channel connected" : "No active Amazon channel connected");
        }
      } catch {
        if (!cancelled) setStatus("Unable to load Amazon channel");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function discoverTypes() {
    if (!channel) return;
    setLoading(true);
    setSchema(null);
    setStatus("Finding Amazon product types…");
    try {
      const response = await fetch("/api/commerce/amazon/product-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id, productId }),
      });
      const data = (await response.json()) as { success?: boolean; productTypes?: ProductTypeOption[]; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Product type discovery failed");
      setProductTypes(data.productTypes ?? []);
      setStatus(`${data.productTypes?.length ?? 0} Amazon product types found`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Product type discovery failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadDefinition() {
    if (!channel || !selectedType) return;
    setSchemaLoading(true);
    setStatus("Loading Amazon listing requirements…");
    try {
      const response = await fetch("/api/commerce/amazon/product-type-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id, productType: selectedType, parentageLevel: "NONE" }),
      });
      const data = (await response.json()) as { success?: boolean; schemaSummary?: SchemaSummary | null; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Product type definition failed");
      setSchema(data.schemaSummary ?? null);
      setStatus(data.schemaSummary ? "Amazon listing requirements loaded" : "Amazon returned a definition without a directly readable schema");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Product type definition failed");
    } finally {
      setSchemaLoading(false);
    }
  }

  return (
    <section className="bg-white border rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Amazon Listing</h2>
        <p className="text-sm text-gray-500 mt-1">Select Amazon’s product type before mapping listing fields. No Amazon listing is created in this step.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={discoverTypes} disabled={!channel || loading} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
          {loading ? "Finding…" : "Find Product Types"}
        </button>
        {productTypes.length > 0 && (
          <select value={selectedType} onChange={(event) => { setSelectedType(event.target.value); setSchema(null); }} className="border rounded-lg px-3 py-2 min-w-64">
            <option value="">Select Amazon product type</option>
            {productTypes.map((item) => <option key={item.name} value={item.name}>{item.displayName} ({item.name})</option>)}
          </select>
        )}
        {selectedType && (
          <button type="button" onClick={loadDefinition} disabled={schemaLoading} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
            {schemaLoading ? "Loading…" : "Load Requirements"}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-4">{status}</p>

      {schema && (
        <div className="mt-5 border-t pt-5">
          <h3 className="font-medium">Required fields</h3>
          {schema.required.length > 0 ? (
            <div className="mt-3 space-y-3">
              {schema.required.map((name) => {
                const property = schema.properties[name];
                return (
                  <div key={name} className="border rounded-lg p-3">
                    <div className="font-medium">{property?.title || name}</div>
                    <div className="text-xs text-gray-500 mt-1">{name}{property?.type ? ` · ${property.type}` : ""}</div>
                    {property?.description && <p className="text-sm text-gray-600 mt-2">{property.description}</p>}
                    {property?.enum && <div className="text-xs text-gray-500 mt-2">Allowed values: {property.enum.map(String).join(", ")}</div>}
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-500 mt-2">No top-level required fields were exposed in the returned schema.</p>}
        </div>
      )}
    </section>
  );
}
