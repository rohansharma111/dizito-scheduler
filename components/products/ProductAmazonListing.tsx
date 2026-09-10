"use client";

import { useEffect, useMemo, useState } from "react";
import type { AmazonSchemaProperty, AmazonListingSchemaSummary } from "@/lib/platforms/amazon/schema";

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

interface ValidationIssue {
  code?: string;
  message?: string;
  severity?: string;
  attributeName?: string;
}

interface ValidationResult {
  status?: string;
  submissionId?: string;
  issues?: Array<ValidationIssue | string>;
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
};

function defaultMapping(attribute: string): FieldMapping {
  return { source: automaticSources[attribute] ?? "manual", value: "" };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function propertyKind(property?: AmazonSchemaProperty) {
  if (!property) return "string";
  if (property.enum?.length) return "enum";
  return property.type || (property.properties ? "object" : property.items ? "array" : "string");
}

function schemaShape(property?: AmazonSchemaProperty): string {
  if (!property) return "No schema details returned.";
  const kind = propertyKind(property);
  if (kind === "array") {
    return property.items ? `Array of ${propertyKind(property.items)} values` : "Array value";
  }
  if (kind === "object") {
    const names = Object.entries(property.properties ?? {})
      .slice(0, 6)
      .map(([name, child]) => `${name}${property.required?.includes(name) ? "*" : ""}: ${propertyKind(child)}`);
    return names.length ? `Object fields — ${names.join(", ")}` : "Object value";
  }
  return kind;
}

function displayIssue(issue: ValidationIssue | string) {
  if (typeof issue === "string") return issue;
  return [issue.code, issue.attributeName, issue.message].filter(Boolean).join(" · ");
}

function issueAttribute(issue: ValidationIssue | string, schema: AmazonListingSchemaSummary): string | null {
  if (typeof issue !== "string" && issue.attributeName) return issue.attributeName;
  const text = typeof issue === "string" ? issue : issue.message ?? "";
  const match = text.match(/attribute\s+([A-Za-z0-9_.-]+)/i) ?? text.match(/for\s+attribute\s+([A-Za-z0-9_.-]+)/i);
  if (match?.[1] && schema.properties[match[1]]) return match[1];

  const normalized = text.toLowerCase();
  const byTitle = Object.entries(schema.properties).find(([, property]) => {
    const title = property.title?.toLowerCase();
    return Boolean(title && normalized.includes(title));
  });
  return byTitle?.[0] ?? null;
}

function ManualField({ property, value, onChange }: { property?: AmazonSchemaProperty; value: string; onChange: (value: string) => void }) {
  const kind = propertyKind(property);

  if (property?.enum?.length) {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full">
        <option value="">Select an allowed value</option>
        {property.enum.map((option, index) => <option key={`${String(option)}-${index}`} value={String(option)}>{property.enumNames?.[index] || String(option)}</option>)}
      </select>
    );
  }

  if (kind === "boolean") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full">
        <option value="">Select true or false</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (kind === "number" || kind === "integer") {
    return <input type="number" value={value} onChange={(event) => onChange(event.target.value)} min={property?.minimum} max={property?.maximum} className="border rounded-lg px-3 py-2 text-sm w-full" />;
  }

  if (kind === "array" || kind === "object") {
    return (
      <div>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} placeholder={kind === "array" ? "Enter JSON array, e.g. [\"Value 1\", \"Value 2\"]" : "Enter JSON object matching the fields below"} className="border rounded-lg px-3 py-2 text-sm w-full font-mono" />
        <p className="text-xs text-gray-500 mt-1">Schema: {schemaShape(property)}</p>
      </div>
    );
  }

  return <input type="text" value={value} onChange={(event) => onChange(event.target.value)} maxLength={property?.maxLength} placeholder="Enter Amazon attribute value" className="border rounded-lg px-3 py-2 text-sm w-full" />;
}

export default function ProductAmazonListing({ productId }: Props) {
  const [channel, setChannel] = useState<CommerceChannel | null>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [schema, setSchema] = useState<AmazonListingSchemaSummary | null>(null);
  const [mappings, setMappings] = useState<Record<string, FieldMapping>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [status, setStatus] = useState("Loading Amazon channel…");
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);

  const issueAttributes = useMemo(() => {
    if (!validation?.issues || !schema) return new Set<string>();
    return new Set(validation.issues.map((issue) => issueAttribute(issue, schema)).filter((name): name is string => Boolean(name)));
  }, [validation, schema]);

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
      const data = (await response.json()) as { success?: boolean; schemaSummary?: AmazonListingSchemaSummary | null; error?: string };
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
        body: JSON.stringify({ channelId: channel.id, productId, productType: selectedType, fieldMappings: mappings }),
      });
      const data = (await response.json()) as { success?: boolean; amazon?: ValidationResult; error?: string };
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
              <p className="text-xs text-gray-500 mt-1">Fields use Amazon’s returned schema. Simple canonical fields can be auto-mapped; Amazon-specific arrays, objects, enums, and numbers get schema-aware controls.</p>
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
                const hasIssue = issueAttributes.has(name);
                return (
                  <div key={name} className={`border rounded-lg p-4 ${hasIssue ? "border-red-400 bg-red-50/30" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{property?.title || name}</div>
                        <div className="text-xs text-gray-500 mt-1">{name}{property?.type ? ` · ${property.type}` : ""}</div>
                        {property?.description && <p className="text-sm text-gray-600 mt-2">{property.description}</p>}
                        <p className="text-xs text-gray-500 mt-2">Schema: {schemaShape(property)}</p>
                      </div>
                      {automatic && <span className="text-xs rounded-full border px-2 py-1">Auto-mapped</span>}
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,240px)_1fr]">
                      <select value={mapping.source} onChange={(event) => updateMapping(name, { source: event.target.value as FieldSource, value: "" })} className="border rounded-lg px-3 py-2">
                        {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      {mapping.source === "manual" ? (
                        <ManualField property={property} value={mapping.value} onChange={(value) => updateMapping(name, { value })} />
                      ) : (
                        <div className="border rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50">Uses the selected Dizito field during validation. If Amazon expects a different structure, switch to Manual value.</div>
                      )}
                    </div>

                    {hasIssue && validation?.issues?.map((issue, index) => issueAttribute(issue, schema) === name ? (
                      <div key={index} className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{displayIssue(issue)}</div>
                    ) : null)}
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
          <div className="text-sm text-gray-600 mt-2">Status: <span className="font-medium">{validation.status || "returned"}</span>{validation.submissionId ? ` · Submission ${validation.submissionId}` : ""}</div>
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
