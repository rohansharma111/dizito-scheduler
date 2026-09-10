"use client";

import { useEffect, useMemo, useState } from "react";
import type { AmazonSchemaProperty, AmazonListingSchemaSummary } from "@/lib/platforms/amazon/schema";

interface CommerceChannel { id: string; provider: string; name: string; status: string; }
interface ProductTypeOption { name: string; displayName: string; marketplaceIds: string[]; }
type FieldSource = "product.name" | "product.description" | "product.brand" | "product.category" | "variant.sku" | "variant.barcode" | "variant.price" | "manual";
interface FieldMapping { source: FieldSource; value: string; }
interface ValidationIssue { code?: string; message?: string; severity?: string; attributeName?: string; attributeNames?: string[]; }
interface ValidationResult { status?: string; submissionId?: string; issues?: Array<ValidationIssue | string>; }
interface Props { productId: string; }
type IdentityMode = "none" | "identifier" | "asin" | "exemption";

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

const automaticSources: Record<string, FieldSource> = { item_name: "product.name", product_description: "product.description", brand: "product.brand" };
const hiddenOperationalFields = new Set(["fulfillment_availability", "fulfillment_channel"]);
const identityFields = new Set(["externally_assigned_product_identifier", "merchant_suggested_asin", "supplier_declared_has_product_identifier_exemption"]);

function defaultMapping(attribute: string): FieldMapping { return { source: automaticSources[attribute] ?? "manual", value: "" }; }
function propertyKind(property?: AmazonSchemaProperty): string { if (!property) return "string"; if (property.enum?.length) return "enum"; return property.type || (property.properties ? "object" : property.items ? "array" : "string"); }
function isAmazonMetadataField(name: string) { return name === "marketplace_id" || name === "language_tag"; }
function schemaShape(property?: AmazonSchemaProperty): string {
  if (!property) return "No schema details returned.";
  const kind = propertyKind(property);
  if (kind === "array") return property.items ? `Array of ${propertyKind(property.items)} values` : "Array value";
  if (kind === "object") {
    const names = Object.entries(property.properties ?? {}).filter(([name]) => !isAmazonMetadataField(name)).slice(0, 6).map(([name, child]) => `${name}${property.required?.includes(name) ? "*" : ""}: ${propertyKind(child)}`);
    return names.length ? `Object fields — ${names.join(", ")}` : "Amazon metadata is supplied automatically.";
  }
  return kind;
}
function displayIssue(issue: ValidationIssue | string) { return typeof issue === "string" ? issue : [issue.code, issue.attributeName, issue.message].filter(Boolean).join(" · "); }
function issueAttributeNames(issue: ValidationIssue | string): string[] {
  if (typeof issue === "string") return [];
  return [...new Set([...(issue.attributeNames ?? []), issue.attributeName].filter((name): name is string => Boolean(name)))];
}
function issueAttribute(issue: ValidationIssue | string, schema: AmazonListingSchemaSummary): string | null {
  const names = issueAttributeNames(issue);
  if (names[0]) return names.find((name) => schema.properties[name]) ?? names[0];
  const text = typeof issue === "string" ? issue : issue.message ?? "";
  const match = text.match(/attribute\s+([A-Za-z0-9_.-]+)/i) ?? text.match(/for\s+attribute\s+([A-Za-z0-9_.-]+)/i);
  if (match?.[1] && schema.properties[match[1]]) return match[1];
  const normalized = text.toLowerCase();
  const byTitle = Object.entries(schema.properties).find(([, property]) => { const title = property.title?.toLowerCase(); return Boolean(title && normalized.includes(title)); });
  return byTitle?.[0] ?? null;
}
function createSchemaValue(property?: AmazonSchemaProperty): unknown {
  const kind = propertyKind(property);
  if (kind === "array") return [];
  if (kind === "object") return Object.fromEntries(Object.entries(property?.properties ?? {}).filter(([name]) => property?.required?.includes(name) && !isAmazonMetadataField(name)).map(([name, child]) => [name, createSchemaValue(child)]));
  return "";
}
function parseStructuredValue(value: string, property?: AmazonSchemaProperty): unknown { if (!value.trim()) return createSchemaValue(property); try { return JSON.parse(value) as unknown; } catch { return createSchemaValue(property); } }
function serializeStructuredValue(value: unknown) { return JSON.stringify(value, null, 2); }
function updateObjectValue(value: unknown, key: string, next: unknown): Record<string, unknown> { return { ...(value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}), [key]: next }; }

function PrimitiveField({ property, value, onChange }: { property?: AmazonSchemaProperty; value: unknown; onChange: (value: unknown) => void }) {
  const kind = propertyKind(property); const stringValue = value === null || value === undefined ? "" : String(value);
  if (property?.enum?.length) return <select value={stringValue} onChange={(event) => onChange(event.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full"><option value="">Select an allowed value</option>{property.enum.map((option, index) => <option key={`${String(option)}-${index}`} value={String(option)}>{property.enumNames?.[index] || String(option)}</option>)}</select>;
  if (kind === "boolean") return <select value={stringValue} onChange={(event) => onChange(event.target.value === "" ? "" : event.target.value === "true")} className="border rounded-lg px-3 py-2 text-sm w-full"><option value="">Select true or false</option><option value="true">true</option><option value="false">false</option></select>;
  if (kind === "number" || kind === "integer") return <input type="number" value={stringValue} onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))} min={property?.minimum} max={property?.maximum} className="border rounded-lg px-3 py-2 text-sm w-full" />;
  return <input type="text" value={stringValue} onChange={(event) => onChange(event.target.value)} maxLength={property?.maxLength} placeholder="Enter value" className="border rounded-lg px-3 py-2 text-sm w-full" />;
}

function StructuredField({ property, value, onChange, depth = 0 }: { property?: AmazonSchemaProperty; value: unknown; onChange: (value: unknown) => void; depth?: number }) {
  const kind = propertyKind(property);
  if (kind !== "array" && kind !== "object") return <PrimitiveField property={property} value={value} onChange={onChange} />;
  if (kind === "object") {
    const objectValue = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const properties = Object.entries(property?.properties ?? {}); const visibleProperties = properties.filter(([name]) => !isAmazonMetadataField(name)); const hasMetadata = properties.some(([name]) => isAmazonMetadataField(name));
    if (visibleProperties.length === 0) return <p className="text-xs text-gray-500">Amazon metadata is supplied automatically.</p>;
    return <div className={`space-y-3 ${depth > 0 ? "rounded-lg border p-3 bg-gray-50" : ""}`}>{hasMetadata && <p className="text-xs text-gray-500">Amazon marketplace and language metadata are supplied automatically.</p>}{visibleProperties.map(([name, child]) => { const childValue = objectValue[name] ?? createSchemaValue(child); const required = property?.required?.includes(name); return <div key={name}><label className="block text-xs font-medium text-gray-700 mb-1">{child.title || name}{required ? " *" : ""}</label>{child.description && <p className="text-xs text-gray-500 mb-1">{child.description}</p>}<StructuredField property={child} value={childValue} depth={depth + 1} onChange={(next) => onChange(updateObjectValue(objectValue, name, next))} /></div>;})}</div>;
  }
  const items = Array.isArray(value) ? value : []; const itemProperty = property?.items;
  return <div className="space-y-3">{items.map((item, index) => <div key={index} className="rounded-lg border p-3 bg-gray-50"><div className="flex items-center justify-between gap-3 mb-2"><span className="text-xs font-medium text-gray-700">Item {index + 1}</span><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-red-600 hover:underline">Remove</button></div><StructuredField property={itemProperty} value={item} depth={depth + 1} onChange={(next) => onChange(items.map((current, itemIndex) => itemIndex === index ? next : current))} /></div>)}<button type="button" onClick={() => onChange([...items, createSchemaValue(itemProperty)])} className="border rounded-lg px-3 py-2 text-sm font-medium hover:bg-white">+ Add {itemProperty?.title || "value"}</button></div>;
}

function ManualField({ property, value, onChange }: { property?: AmazonSchemaProperty; value: string; onChange: (value: string) => void }) {
  const kind = propertyKind(property);
  if (kind === "array" || kind === "object") return <div><StructuredField property={property} value={parseStructuredValue(value, property)} onChange={(next) => onChange(serializeStructuredValue(next))} /><details className="mt-3"><summary className="cursor-pointer text-xs text-gray-500">Advanced JSON</summary><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="mt-2 border rounded-lg px-3 py-2 text-sm w-full font-mono" placeholder="Enter the exact Amazon JSON value" /></details><p className="text-xs text-gray-500 mt-2">Schema: {schemaShape(property)}</p></div>;
  return <PrimitiveField property={property} value={value} onChange={(next) => onChange(next === null || next === undefined ? "" : String(next))} />;
}

function IdentityCard({ schema, mode, setMode, identifierType, setIdentifierType, identifierValue, setIdentifierValue, asin, setAsin, error }: { schema: AmazonListingSchemaSummary; mode: IdentityMode; setMode: (mode: IdentityMode) => void; identifierType: string; setIdentifierType: (value: string) => void; identifierValue: string; setIdentifierValue: (value: string) => void; asin: string; setAsin: (value: string) => void; error: string }) {
  const supportsIdentifier = Boolean(schema.properties.externally_assigned_product_identifier);
  const supportsAsin = Boolean(schema.properties.merchant_suggested_asin);
  const supportsExemption = Boolean(schema.properties.supplier_declared_has_product_identifier_exemption);
  return <div className="border rounded-xl p-5 bg-gray-50">
    <div><h3 className="font-semibold">Product identification</h3><p className="text-sm text-gray-600 mt-1">Tell Amazon how this product should be identified. Do not use the Dizito SKU as an Amazon identifier.</p></div>
    <div className="mt-4 space-y-3">
      {supportsIdentifier && <label className="flex items-start gap-3 border rounded-lg p-3 bg-white cursor-pointer"><input type="radio" checked={mode === "identifier"} onChange={() => setMode("identifier")} className="mt-1" /><span><span className="font-medium block">I have a product identifier</span><span className="text-xs text-gray-500">Use a real EAN, UPC, GTIN, or ISBN accepted for this product.</span></span></label>}
      {supportsAsin && <label className="flex items-start gap-3 border rounded-lg p-3 bg-white cursor-pointer"><input type="radio" checked={mode === "asin"} onChange={() => setMode("asin")} className="mt-1" /><span><span className="font-medium block">I already have an Amazon ASIN</span><span className="text-xs text-gray-500">Enter the ASIN supplied by Amazon. Never invent one.</span></span></label>}
      {supportsExemption && <label className="flex items-start gap-3 border rounded-lg p-3 bg-white cursor-pointer"><input type="radio" checked={mode === "exemption"} onChange={() => setMode("exemption")} className="mt-1" /><span><span className="font-medium block">I need a product-identifier exemption</span><span className="text-xs text-gray-500">Use this only when Amazon has approved or supports an exemption for the product.</span></span></label>}
      {!supportsIdentifier && !supportsAsin && !supportsExemption && <p className="text-sm text-gray-600">Amazon did not expose a product-identity field in this product definition. Amazon may resolve identity through another product-type-specific requirement.</p>}
    </div>
    {mode === "identifier" && <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]"><select value={identifierType} onChange={(event) => setIdentifierType(event.target.value)} className="border rounded-lg px-3 py-2 bg-white"><option value="ean">EAN</option><option value="upc">UPC</option><option value="gtin">GTIN</option><option value="isbn">ISBN</option></select><input value={identifierValue} onChange={(event) => setIdentifierValue(event.target.value)} placeholder="Enter the real product identifier" className="border rounded-lg px-3 py-2 bg-white" /></div>}
    {mode === "asin" && <div className="mt-4"><label className="block text-sm font-medium mb-1">Amazon ASIN</label><input value={asin} onChange={(event) => setAsin(event.target.value.toUpperCase())} placeholder="e.g. B0XXXXXXXX" maxLength={10} className="border rounded-lg px-3 py-2 bg-white w-full md:w-80" /></div>}
    {mode === "exemption" && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Dizito will declare the identifier exemption to Amazon and will not send an external product identifier at the same time.</div>}
    {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}

export default function ProductAmazonListing({ productId }: Props) {
  const [channel, setChannel] = useState<CommerceChannel | null>(null); const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]); const [selectedType, setSelectedType] = useState(""); const [schema, setSchema] = useState<AmazonListingSchemaSummary | null>(null); const [mappings, setMappings] = useState<Record<string, FieldMapping>>({}); const [validation, setValidation] = useState<ValidationResult | null>(null); const [status, setStatus] = useState("Loading Amazon channel…"); const [loading, setLoading] = useState(false); const [schemaLoading, setSchemaLoading] = useState(false); const [validationLoading, setValidationLoading] = useState(false);
  const [identityMode, setIdentityMode] = useState<IdentityMode>("none"); const [identifierType, setIdentifierType] = useState("ean"); const [identifierValue, setIdentifierValue] = useState(""); const [asin, setAsin] = useState(""); const [identityError, setIdentityError] = useState("");
  const issueAttributes = useMemo(() => { if (!validation?.issues || !schema) return new Set<string>(); return new Set(validation.issues.flatMap((issue) => issueAttributeNames(issue).filter((name) => Boolean(schema.properties[name]))).concat(validation.issues.map((issue) => issueAttribute(issue, schema)).filter((name): name is string => Boolean(name)))); }, [validation, schema]);
  const fieldNames = useMemo(() => { if (!schema) return []; return [...new Set([...schema.required, ...schema.conditionalRequired, ...issueAttributes])].filter((name) => Boolean(schema.properties[name]) && !identityFields.has(name) && !hiddenOperationalFields.has(name)); }, [schema, issueAttributes]);
  useEffect(() => { let cancelled = false; async function load() { try { const response = await fetch("/api/commerce/channels"); const data = (await response.json()) as { channels?: CommerceChannel[] }; const amazon = data.channels?.find((item) => item.provider === "amazon" && item.status === "active") ?? null; if (!cancelled) { setChannel(amazon); setStatus(amazon ? "Amazon channel connected" : "No active Amazon channel connected"); } } catch { if (!cancelled) setStatus("Unable to load Amazon channel"); } } void load(); return () => { cancelled = true; }; }, []);
  async function discoverTypes() { if (!channel) return; setLoading(true); setSchema(null); setMappings({}); setValidation(null); setIdentityMode("none"); setIdentityError(""); setStatus("Finding Amazon product types…"); try { const response = await fetch("/api/commerce/amazon/product-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: channel.id, productId }) }); const data = (await response.json()) as { success?: boolean; productTypes?: ProductTypeOption[]; error?: string }; if (!response.ok || !data.success) throw new Error(data.error || "Product type discovery failed"); setProductTypes(data.productTypes ?? []); setStatus(`${data.productTypes?.length ?? 0} Amazon product types found`); } catch (error) { setStatus(error instanceof Error ? error.message : "Product type discovery failed"); } finally { setLoading(false); } }
  async function loadDefinition() { if (!channel || !selectedType) return; setSchemaLoading(true); setValidation(null); setIdentityMode("none"); setIdentityError(""); setStatus("Loading Amazon product requirements…"); try { const response = await fetch("/api/commerce/amazon/product-type-definition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: channel.id, productType: selectedType, parentageLevel: "NONE" }) }); const data = (await response.json()) as { success?: boolean; schemaSummary?: AmazonListingSchemaSummary | null; error?: string }; if (!response.ok || !data.success) throw new Error(data.error || "Product type definition failed"); const nextSchema = data.schemaSummary ?? null; setSchema(nextSchema); if (nextSchema) { const nextMappings: Record<string, FieldMapping> = {}; for (const name of [...nextSchema.required, ...nextSchema.conditionalRequired]) if (!identityFields.has(name) && !hiddenOperationalFields.has(name)) nextMappings[name] = defaultMapping(name); setMappings(nextMappings); } setStatus(nextSchema ? "Amazon product requirements loaded" : "Amazon returned no readable listing schema"); } catch (error) { setStatus(error instanceof Error ? error.message : "Product type definition failed"); } finally { setSchemaLoading(false); } }
  function updateMapping(attribute: string, patch: Partial<FieldMapping>) { setMappings((current) => ({ ...current, [attribute]: { ...(current[attribute] ?? defaultMapping(attribute)), ...patch } })); setValidation(null); }
  function buildIdentityMappings(next: Record<string, FieldMapping>) {
    if (!schema) return next;
    for (const name of identityFields) delete next[name];
    if (identityMode === "identifier" && schema.properties.externally_assigned_product_identifier) next.externally_assigned_product_identifier = { source: "manual", value: JSON.stringify({ type: identifierType, value: identifierValue }) };
    if (identityMode === "asin" && schema.properties.merchant_suggested_asin) next.merchant_suggested_asin = { source: "manual", value: JSON.stringify(asin) };
    if (identityMode === "exemption" && schema.properties.supplier_declared_has_product_identifier_exemption) next.supplier_declared_has_product_identifier_exemption = { source: "manual", value: JSON.stringify([{ value: true }]) };
    return next;
  }
  function validateIdentity() {
    setIdentityError("");
    if (!schema || identityMode === "none") return true;
    if (identityMode === "identifier") {
      const normalized = identifierValue.replace(/[\-\s]/g, "").toUpperCase();
      if (!normalized) { setIdentityError("Enter a real product identifier."); return false; }
      if (identifierType === "isbn") {
        if (!/^\d{9}[\dX]$/.test(normalized) && !/^\d{13}$/.test(normalized)) { setIdentityError("Enter a valid ISBN-10 or ISBN-13."); return false; }
      } else if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(normalized)) { setIdentityError("Enter an 8, 12, 13, or 14 digit product identifier."); return false; }
      setIdentifierValue(normalized); return true;
    }
    if (identityMode === "asin" && !/^B[0-9A-Z]{9}$/.test(asin.trim().toUpperCase())) { setIdentityError("Enter a valid 10-character Amazon ASIN starting with B."); return false; }
    if (identityMode === "exemption" && !schema.properties.supplier_declared_has_product_identifier_exemption) { setIdentityError("Amazon did not expose the product-identifier exemption field for this product type."); return false; }
    return true;
  }
  async function validateListing() { if (!channel || !selectedType || !schema) return; if (!validateIdentity()) return; setValidationLoading(true); setValidation(null); setStatus("Sending Amazon validation preview…"); try { const nextMappings = buildIdentityMappings({ ...mappings }); const response = await fetch("/api/commerce/amazon/listing-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: channel.id, productId, productType: selectedType, fieldMappings: nextMappings }) }); const data = (await response.json()) as { success?: boolean; amazon?: ValidationResult; error?: string }; if (!response.ok || !data.success) throw new Error(data.error || "Amazon validation preview failed"); setValidation(data.amazon ?? null); const issueNames = (data.amazon?.issues ?? []).flatMap(issueAttributeNames).filter((name) => schema.properties[name] && !identityFields.has(name) && !hiddenOperationalFields.has(name)); if (issueNames.length) setMappings((current) => { const next = { ...current }; for (const name of issueNames) if (!next[name]) next[name] = defaultMapping(name); return next; }); const issueCount = data.amazon?.issues?.length ?? 0; setStatus(issueCount === 0 ? "Amazon validation preview returned no issues" : `Amazon validation preview returned ${issueCount} issue${issueCount === 1 ? "" : "s"}`); } catch (error) { setStatus(error instanceof Error ? error.message : "Amazon validation preview failed"); } finally { setValidationLoading(false); } }

  return <section className="bg-white border rounded-xl p-6">
    <div className="mb-5"><h2 className="text-lg font-semibold">Amazon Listing</h2><p className="text-sm text-gray-500 mt-1">Choose Amazon’s product type, identify the product, complete only the product information Amazon asks for, then validate without creating a listing.</p></div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={discoverTypes} disabled={!channel || loading} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">{loading ? "Finding…" : "Find Product Types"}</button>{productTypes.length > 0 && <select value={selectedType} onChange={(event) => { setSelectedType(event.target.value); setSchema(null); setMappings({}); setValidation(null); setIdentityMode("none"); }} className="border rounded-lg px-3 py-2 min-w-64"><option value="">Select Amazon product type</option>{productTypes.map((item) => <option key={item.name} value={item.name}>{item.displayName} ({item.name})</option>)}</select>}{selectedType && <button type="button" onClick={loadDefinition} disabled={schemaLoading} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">{schemaLoading ? "Loading…" : "Load Requirements"}</button>}</div>
    <p className="text-sm text-gray-500 mt-4">{status}</p>
    {schema && <div className="mt-5 border-t pt-5">
      <IdentityCard schema={schema} mode={identityMode} setMode={(mode) => { setIdentityMode(mode); setIdentityError(""); }} identifierType={identifierType} setIdentifierType={setIdentifierType} identifierValue={identifierValue} setIdentifierValue={setIdentifierValue} asin={asin} setAsin={setAsin} error={identityError} />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">Product information</h3><p className="text-xs text-gray-500 mt-1">These are seller-specific product facts. Offer and fulfillment fields are handled separately and are not collected here.</p></div><button type="button" onClick={validateListing} disabled={validationLoading} className="border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">{validationLoading ? "Validating…" : "Validate with Amazon"}</button></div>
      {fieldNames.length > 0 ? <div className="mt-4 space-y-4">{fieldNames.map((name) => { const property = schema.properties[name]; const mapping = mappings[name] ?? defaultMapping(name); const automatic = automaticSources[name]; const hasIssue = issueAttributes.has(name); const unconditional = schema.required.includes(name); const conditional = schema.conditionalRequired.includes(name); const discovered = !unconditional && !conditional; return <div key={name} className={`border rounded-lg p-4 ${hasIssue ? "border-red-400 bg-red-50/30" : ""}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{property?.title || name}{unconditional ? " *" : ""}</div><div className="text-xs text-gray-500 mt-1">{name}{property?.type ? ` · ${property.type}` : ""}</div>{property?.description && <p className="text-sm text-gray-600 mt-2">{property.description}</p>}<p className="text-xs text-gray-500 mt-2">Schema: {schemaShape(property)}</p></div><div className="flex flex-wrap gap-2">{automatic && <span className="text-xs rounded-full border px-2 py-1">Auto-mapped</span>}{conditional && <span className="text-xs rounded-full border px-2 py-1">Conditional</span>}{discovered && <span className="text-xs rounded-full border px-2 py-1">Required by Amazon validation</span>}</div></div><div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,240px)_1fr]"><select value={mapping.source} onChange={(event) => updateMapping(name, { source: event.target.value as FieldSource, value: "" })} className="border rounded-lg px-3 py-2">{sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{mapping.source === "manual" ? <ManualField property={property} value={mapping.value} onChange={(value) => updateMapping(name, { value })} /> : <div className="border rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50">Uses the selected Dizito field during validation. If Amazon expects a different structure, switch to Manual value.</div>}</div>{hasIssue && validation?.issues?.map((issue, index) => issueAttribute(issue, schema) === name ? <div key={index} className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{displayIssue(issue)}</div> : null)}</div>; })}</div> : <p className="text-sm text-gray-500 mt-4">No additional product fields were exposed by the returned schema.</p>}
      {validation && <div className="mt-6 border-t pt-5"><h3 className="font-medium">Amazon validation result</h3><div className="text-sm text-gray-600 mt-2">Status: <span className="font-medium">{validation.status || "returned"}</span>{validation.submissionId ? ` · Submission ${validation.submissionId}` : ""}</div>{validation.issues && validation.issues.length > 0 ? <div className="mt-3 space-y-2">{validation.issues.map((issue, index) => <div key={index} className="border rounded-lg p-3 text-sm">{displayIssue(issue)}</div>)}</div> : <p className="text-sm text-gray-600 mt-3">Amazon returned no validation issues.</p>}</div>}
    </div>}
  </section>;
}
