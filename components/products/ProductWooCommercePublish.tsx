"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDot, Loader2, Send, ShieldCheck } from "lucide-react";
import { DizitoCard, DizitoSectionHeader } from "@/components/dizito/DizitoUI";

interface Variant {
  id: number | string;
  name?: string | null;
  sku?: string | null;
  price?: number | string | null;
}
interface Media { secure_url?: string | null; is_primary?: boolean; sort_order?: number; }
interface Props {
  product: { id: number | string; name: string; description?: string | null; category?: string | null; variants: Variant[]; media?: Media[] };
}
type Listing = { id: string | number; external_id?: string | null; status?: string; sync_status?: string };
type WorkflowResponse = { success?: boolean; error?: string; listing?: Listing; payload?: Record<string, unknown>; status?: string; externalId?: string | null; reconciliationRequired?: boolean; idempotentReplay?: boolean; attempt?: Record<string, unknown> };

export default function ProductWooCommercePublish({ product }: Props) {
  const [channels, setChannels] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [channelId, setChannelId] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [sku, setSku] = useState(product.variants.find((variant) => variant.sku)?.sku || `DIZITO-${product.id}`);
  const [price, setPrice] = useState(String(product.variants.find((variant) => variant.price != null)?.price ?? ""));
  const [description, setDescription] = useState(product.description ?? "");
  const [busy, setBusy] = useState<"load" | "draft" | "publish" | "reconcile" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [externalId, setExternalId] = useState("");

  const primaryImage = useMemo(() => product.media?.find((media) => media.is_primary)?.secure_url ?? product.media?.[0]?.secure_url, [product.media]);

  async function loadChannels() {
    setBusy("load"); setError(null);
    try {
      const response = await fetch("/api/commerce/channels");
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.error || "Unable to load commerce channels");
      const connected = (data.channels ?? []).filter((channel: { provider: string; id: string; name: string; status: string }) => channel.provider === "woocommerce");
      setChannels(connected);
      const selected = connected.find((channel: { status: string }) => channel.status === "active") ?? connected[0];
      if (selected) setChannelId(selected.id);
      if (!selected) setError("Connect a WooCommerce channel before preparing a listing.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load channels"); }
    finally { setBusy(null); }
  }

  async function prepareDraft() {
    if (!channelId) { setError("Select a WooCommerce store first."); return; }
    if (product.variants.length === 0) { setError("Add at least one variant to this Dizito product before preparing a WooCommerce listing."); return; }
    if (!sku.trim()) { setError("A SKU is required so an uncertain publish can be reconciled safely."); return; }
    if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) { setError("Enter a valid non-negative price."); return; }
    setBusy("draft"); setError(null); setMessage(null); setConfirmPublish(false);
    try {
      const response = await fetch("/api/commerce/woocommerce/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId, productId: String(product.id),
          product: {
            name: product.name, description, sku: sku.trim(), price: price.trim(),
            images: primaryImage ? [primaryImage] : [], categories: product.category ? [product.category] : [],
          },
          variants: [{ variantId: String(product.variants[0].id) }],
          providerMetadata: { uiSource: "product-details", canonicalProductName: product.name },
        }),
      });
      const data: WorkflowResponse = await response.json();
      if (!response.ok || !data.success || !data.listing || !data.payload) throw new Error(data.error || "Unable to prepare WooCommerce draft");
      setListing(data.listing); setPayload(data.payload); setIdempotencyKey(""); setExternalId("");
      setMessage("Draft prepared in Dizito. No product has been created in WooCommerce yet.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to prepare draft"); }
    finally { setBusy(null); }
  }

  async function publish() {
    if (!channelId || !listing || !payload || !confirmPublish) return;
    const key = idempotencyKey || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `dizito-${product.id}-${Date.now()}`);
    setIdempotencyKey(key); setBusy("publish"); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/commerce/woocommerce/publish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, listingId: String(listing.id), idempotencyKey: key, confirmLivePublish: true, payload: { ...payload, status: "publish" } }),
      });
      const data: WorkflowResponse = await response.json();
      if (data.reconciliationRequired || response.status === 202) {
        setMessage("WooCommerce may have accepted the product. Do not publish again. Reconcile the result below to confirm its status.");
        return;
      }
      if (!response.ok || !data.success) throw new Error(data.error || "WooCommerce publish failed");
      const resolvedId = data.externalId ? String(data.externalId) : "";
      setExternalId(resolvedId);
      setListing((current) => current ? { ...current, external_id: resolvedId || current.external_id, status: "active", sync_status: "synced" } : current);
      setMessage(data.idempotentReplay ? `Existing publish result confirmed. WooCommerce product ID: ${resolvedId || "recorded"}.` : `Published successfully. WooCommerce product ID: ${resolvedId || "recorded"}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to publish"); }
    finally { setBusy(null); }
  }

  async function reconcile() {
    if (!channelId || !listing || !idempotencyKey) { setError("Publish attempt details are missing. Do not retry publishing; reload the workflow and inspect the attempt."); return; }
    setBusy("reconcile"); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/commerce/woocommerce/reconcile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, listingId: String(listing.id), idempotencyKey, externalId: externalId.trim() || undefined, sku: sku.trim() || undefined }),
      });
      const data: WorkflowResponse = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to reconcile publish attempt");
      const foundId = data.externalId ? String(data.externalId) : externalId;
      if (foundId) setExternalId(foundId);
      setMessage(`Reconciliation completed. WooCommerce product ID: ${foundId || "recorded"}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Reconciliation failed"); }
    finally { setBusy(null); }
  }

  return (
    <DizitoCard>
      <DizitoSectionHeader title="WooCommerce publishing" description="Prepare and review a listing, then explicitly publish it to your selected WooCommerce store." />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>Publishing creates a product in the selected store. Verify it is your staging store before continuing.</span></div>
          <button type="button" onClick={() => void loadChannels()} disabled={busy !== null} className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold disabled:opacity-50">{busy === "load" ? "Loading…" : channels.length ? "Refresh stores" : "Load stores"}</button>
        </div>
        {channels.length > 0 && <label className="block text-sm font-medium text-slate-700">Destination store
          <select value={channelId} onChange={(event) => { setChannelId(event.target.value); setListing(null); setPayload(null); setConfirmPublish(false); setIdempotencyKey(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name} · {channel.status}</option>)}
          </select>
        </label>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">WooCommerce SKU
            <input value={sku} onChange={(event) => setSku(event.target.value)} disabled={Boolean(listing)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 disabled:bg-slate-50" />
          </label>
          <label className="text-sm font-medium text-slate-700">Price
            <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" disabled={Boolean(listing)} placeholder="e.g. 1.00" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 disabled:bg-slate-50" />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} disabled={Boolean(listing)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 disabled:bg-slate-50" />
        </label>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">Review preview</p>
          <p className="mt-1">{product.name}</p>
          <p className="text-slate-600">SKU: {sku || "—"} · Price: {price || "—"}</p>
          <p className="text-xs text-slate-500">Product images and category are taken from the canonical Dizito product.</p>
        </div>
        {!listing ? <button type="button" onClick={() => void prepareDraft()} disabled={busy !== null || !channelId} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{busy === "draft" ? <Loader2 size={16} className="animate-spin" /> : <CircleDot size={16} />} Prepare draft</button> : (
          <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-900"><ShieldCheck size={17} /> Draft prepared · Listing {listing.id}</p>
            {listing.external_id && <p className="text-sm text-emerald-800">Linked external product ID: {listing.external_id}</p>}
            {!externalId && <label className="block text-sm font-medium text-slate-700">WooCommerce product ID (for reconciliation, if known)
              <input value={externalId} onChange={(event) => setExternalId(event.target.value)} placeholder="Leave blank to reconcile by SKU" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" />
            </label>}
            <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" checked={confirmPublish} onChange={(event) => setConfirmPublish(event.target.checked)} className="mt-1" /><span>I verified the destination is a disposable staging store and authorize creating this product there.</span></label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void publish()} disabled={busy !== null || !confirmPublish || Boolean(listing.external_id)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publish to WooCommerce</button>
              {idempotencyKey && <button type="button" onClick={() => void reconcile()} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 disabled:opacity-50">{busy === "reconcile" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Reconcile result</button>}
            </div>
            {idempotencyKey && <p className="break-all text-xs text-slate-500">Publish attempt key: {idempotencyKey}. Keep this page open until the result is confirmed. If the result is uncertain, reconcile before any retry.</p>}
          </div>
        )}
        {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </DizitoCard>
  );
}
