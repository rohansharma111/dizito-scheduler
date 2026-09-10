"use client";

import { useState } from "react";

interface CatalogItem { asin: string; itemName?: string | null; brand?: string | null; productType?: string | null; identifiers?: Array<{ identifier?: string; identifierType?: string }>; }

export default function AmazonCatalogMatch({ channelId, productId, onSelectASIN }: { channelId: string; productId: string; onSelectASIN?: (asin: string) => void }) {
  const [identifierType, setIdentifierType] = useState("EAN");
  const [identifier, setIdentifier] = useState("");
  const [keywords, setKeywords] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedASIN, setSelectedASIN] = useState("");

  async function search(body: Record<string, string>) {
    setLoading(true); setStatus("");
    try {
      const response = await fetch("/api/commerce/amazon/catalog-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId, productId, ...body }) });
      const data = (await response.json()) as { success?: boolean; items?: CatalogItem[]; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Amazon catalog search failed");
      setItems(data.items ?? []); setStatus(data.items?.length ? `${data.items.length} catalog match${data.items.length === 1 ? "" : "es"} found` : "No Amazon catalog matches found");
    } catch (error) { setItems([]); setStatus(error instanceof Error ? error.message : "Amazon catalog search failed"); }
    finally { setLoading(false); }
  }

  function selectASIN(asin: string) {
    const normalized = asin.trim().toUpperCase();
    setSelectedASIN(normalized);
    onSelectASIN?.(normalized);
    setStatus(`Selected existing ASIN ${normalized}. The existing-ASIN listing flow will use this match.`);
  }

  return <div className="mt-5 border rounded-xl p-5 bg-gray-50">
    <div><h3 className="font-semibold">Amazon catalog matching</h3><p className="text-sm text-gray-600 mt-1">If this product already exists on Amazon, match it to an existing ASIN before creating new product content.</p></div>
    <div className="mt-4 grid gap-3 md:grid-cols-[140px_1fr_auto]">
      <select value={identifierType} onChange={(e) => setIdentifierType(e.target.value)} className="border rounded-lg px-3 py-2 bg-white"><option>EAN</option><option>UPC</option><option>GTIN</option><option>ISBN</option></select>
      <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Product identifier" className="border rounded-lg px-3 py-2 bg-white" />
      <button type="button" disabled={loading || !identifier.trim()} onClick={() => void search({ identifier, identifierType })} className="border rounded-lg px-4 py-2 font-medium disabled:opacity-50">{loading ? "Searching…" : "Find by identifier"}</button>
    </div>
    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
      <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Or search Amazon catalog by product keywords" className="border rounded-lg px-3 py-2 bg-white" />
      <button type="button" disabled={loading || !keywords.trim()} onClick={() => void search({ keywords })} className="border rounded-lg px-4 py-2 font-medium disabled:opacity-50">Search catalog</button>
    </div>
    {selectedASIN && <p className="text-sm text-gray-700 mt-3">Selected ASIN: <span className="font-mono font-medium">{selectedASIN}</span></p>}
    {status && <p className="text-sm text-gray-600 mt-3">{status}</p>}
    {items.length > 0 && <div className="mt-4 space-y-3">{items.map((item) => <div key={item.asin} className={`border rounded-lg p-4 bg-white ${selectedASIN === item.asin ? "ring-1" : ""}`}><div className="flex flex-wrap justify-between gap-3"><div><div className="font-medium">{item.itemName || "Amazon catalog item"}</div><div className="text-sm text-gray-600 mt-1">ASIN: <span className="font-mono">{item.asin}</span>{item.brand ? ` · ${item.brand}` : ""}</div>{item.productType && <div className="text-xs text-gray-500 mt-1">Product type: {item.productType}</div>}</div><button type="button" onClick={() => selectASIN(item.asin)} className="border rounded-lg px-3 py-2 text-sm font-medium">{selectedASIN === item.asin ? "Selected" : "Use this ASIN"}</button></div></div>)}</div>}
    <p className="text-xs text-gray-500 mt-4">Matching does not create or modify an Amazon listing. The ASIN must come from Amazon's catalog response.</p>
  </div>;
}
