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

type FieldSource =
  | "product.name"
  | "product.description"
  | "product.brand"
  | "product.category"
  | "variant.sku"
  | "variant.barcode"
  | "variant.price"
  | "manual";

interface FieldMapping {
  source: FieldSource;
  value: string;
}

interface SchemaProperty {
  title?: string;
  description?: string;
  type?: string;
  enum?: unknown[];
}

interface SchemaSummary {
  required: string[];
  properties: Record<string, SchemaProperty>;
}

interface ValidationResult {
  status?: string;
  submissionId?: string;
  issues?: Array<{ code?: string; message?: string; severity?: string; attributeName?: string } | string>;
}

interface Props {
  productId: string;
}

const sourceOptions: Array<{ value: FieldSource; label: string }> = [
  { value: "product.name", label: "Product name" },
  { value: "product.description", label: "Product description" },
  { value: "product.brand", label: "Product brand" },
  { value: "product.category", label: "Product category" },
  { value: "variant.sku", label: "Variant SKU" },
  { value: "variant.barcode", label: "Variant barcode" },
  { value: "variant.price", label: "Variant price" },
  { value: "manual", label: "Manual value" },
];

const automaticSources: Record<string, FieldSource> = {
  item_name: "product.name",
  product_description: "product.description",
  brand: "product.brand",
  item_type_keyword: "product.category",
};

function defaultMapping(attribute: string): FieldMapping {
  return {
    source: automaticSources[attribute] ?? "manual",
    value: "",
  };
}

function displayIssue(issue: ValidationResult["issues"][number]) {
  if (typeof issue === "string") return issue;
  return [issue.code, issue.attributeName, issue.message].filter(Boolean).join(" · ");
}

export default function ProductAmazonListing({ productId }: Props) {
  const [channel, setChannel] = useState<CommerceChannel | null>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [schema, setSchema] = useState<SchemaSummary | null>(null);
  const [mappings, setMappings] = useState<Record<string, FieldMapping>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [status, setStatus] = useState("Loading Amazon channel…");
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);

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
    setMappings({});
    setValidation(null);
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
    setValidation(null);
    setStatus("Loading Amazon listing requirements…");
    try {
      const response = await fetch("/api/commerce/amazon/product-type-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id, productType: selectedType, parentageLevel: "NONE" }),
      });
      const data = (await response.json()) as { success?: boolean; schemaSummary?: SchemaSummary | null; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Product type definition failed");
      const nextSchema = data.schemaSummary ?? null;
      setSchema(nextSchema);
      if (nextSchema) {
        const nextMappings: Record<string, FieldMapping> = {};
        for (const name of nextSchema.required) nextMappings[name] = defaultMapping(name);
        setMappings(nextMappings);
      }
      setStatus(nextSchema ? "Amazon listing requirements loaded" : "Amazon returned no readable listing schema");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Product type definition failed");
    } finally {
      setSchemaLoading(false);
    }
  }

  function updateMapping(attribute: string, patch: Partial<FieldMapping>) {
    setMappings((current) => ({
      ...current,
      [attribute]: { ...(current[attribute] ?? defaultMapping(attribute)), ...patch },
    }));
    setValidation(null);
  }

  async function validateListing() {
    if (!channel || !selectedType || !schema) return;
    setValidationLoading(true);
    setValidation(null);
    setStatus("Sending Amazon validation preview…");
    try {
      const response = await fetch("/api/commerce/amazon/listing-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          productId,
          productType: selectedType,
          fieldMappings: mappings,
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        amazon?: ValidationResult;
        error?: string;
      };
      if (!response.ok || !data.success) throw new Error(data.error || "Amazon validation preview failed");
      setValidation(data.amazon ?? null);
      const issueCount = data.amazon?.issues?.length ?? 0;
      setStatus(issueCount === 0 ? "Amazon validation preview returned no issues" : `Amazon validation preview returned ${issueCount} issue${issueCount === 1 ? "" : "s"}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Amazon validation preview failed");
    } finally {
      setValidationLoading(false);
    }
  }

  return (
    <section className="bg-white border rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Amazon Listing</h2>
        <p className="text-sm text-gray-500 mt-1">Select Amazon’s product type, map required fields, then validate the listing without creating it.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={discoverTypes} disabled={!channel || loading} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
          {loading ? "Finding…" : "Find Product Types"}
        </button>
        {productTypes.length > 0 && (
          <select value={selectedType} onChange={(event) => { setSelectedType(event.target.value); setSchema(null); setMappings({}); setValidation(null); }} className="border rounded-lg px-3 py-2 min-w-64">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">Required field mapping</h3>
              <p className="text-xs text-gray-500 mt-1">Dizito data is mapped automatically where the attribute is unambiguous. Use Manual value for Amazon-specific fields.</p>
            </div>
            <button type="button" onClick={validateListing} disabled={validationLoading} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
              {validationLoading ? "Validating…" : "Validate with Amazon"}
            </button>
          </div>

          {schema.required.length > 0 ? (
            <div className="mt-4 space-y-4">
              {schema.required.map((name) => {
                const property = schema.properties[name];
                const mapping = mappings[name] ?? defaultMapping(name);
                const automatic = automaticSources[name];
                return (
                  <div key={name} className="border rounded-lg p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{property?.title || name}</div>
                        <div className="text-xs text-gray-500 mt-1">{name}{property?.type ? ` · ${property.type}` : ""}</div>
                        {property?.description && <p className="text-sm text-gray-600 mt-2">{property.description}</p>}
                      </div>
                      {automatic && <span className="text-xs rounded-full border px-2 py-1">Auto-mapped</span>}
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,240px)_1fr]">
                      <select value={mapping.source} onChange={(event) => updateMapping(name, { source: event.target.value as FieldSource, value: "" })} className="border rounded-lg px-3 py-2">
                        {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      {mapping.source === "manual" ? (
                        <textarea value={mapping.value} onChange={(event) => updateMapping(name, { value: event.target.value })} rows={3} placeholder={property?.type === "array" || property?.type === "object" ? "Enter a value or JSON for this Amazon attribute" : "Enter Amazon attribute value"} className="border rounded-lg px-3 py-2 text-sm" />
                      ) : (
                        <div className="border rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50">Uses the selected Dizito field during validation.</div>
                      )}
                    </div>

                    {property?.enum && <div className="text-xs text-gray-500 mt-2">Allowed values: {property.enum.map(String).join(", ")}</div>}
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-500 mt-3">No top-level required fields were exposed in the returned schema.</p>}
        </div>
      )}

      {validation && (
        <div className="mt-5 border-t pt-5">
          <h3 className="font-medium">Amazon validation result</h3>
          <div className="text-sm text-gray-600 mt-2">
            Status: <span className="font-medium">{validation.status || "returned"}</span>
            {validation.submissionId ? ` · Submission ${validation.submissionId}` : ""}
          </div>
          {validation.issues && validation.issues.length > 0 ? (
            <div className="mt-3 space-y-2">
              {validation.issues.map((issue, index) => <div key={index} className="border rounded-lg p-3 text-sm">{displayIssue(issue)}</div>)}
            </div>
          ) : <p className="text-sm text-gray-600 mt-3">Amazon returned no validation issues.</p>}
        </div>
      )}
    </section>
  );
}
