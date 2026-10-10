"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { DizitoBadge, DizitoButton, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

const PLATFORMS = ["facebook", "instagram", "linkedin", "pinterest", "google_business"] as const;
type Platform = typeof PLATFORMS[number];
type Variant = { id: number; platform: Platform; hook: string | null; body: string | null; cta: string | null; mediaId: number | null; status: string };
type ContentItem = {
  id: number; campaignId: number; campaignName: string | null; campaignObjective: string | null; campaignAudience: string | null; campaignCta: string | null; offerId: number | null; offerName: string | null; productNames: string[]; contentType: string; format: string | null; topic: string | null;
  angle: string | null; hook: string | null; body: string | null; cta: string | null; mediaId: number | null; productIds: number[];
  status: string; plannedFor: string | null; postIds: number[]; planningMetadata: Record<string, unknown>; variants?: Variant[];
};
type Account = { id: number; account_name: string; platform: string; status: string };

function defaultSchedule(plannedFor: string | null) {
  if (plannedFor) { const date = new Date(plannedFor); if (!Number.isNaN(date.getTime())) { date.setHours(10, 0, 0, 0); return date.toISOString().slice(0, 16); } }
  const date = new Date(Date.now() + 60 * 60 * 1000); date.setSeconds(0, 0); return date.toISOString().slice(0, 16);
}
function displayCopy(item: ContentItem) { return [item.hook, item.body, item.topic ? `Topic: ${item.topic}` : null, item.cta].filter(Boolean).join("\n\n"); }
function platformLabel(platform: string) { return platform === "google_business" ? "Google Business" : platform.charAt(0).toUpperCase() + platform.slice(1); }
type WooCommercePlanningProduct = { provider?: string; externalProductId?: number; name: string; sku?: string | null; priceSnapshot?: string | null; stockStatusSnapshot?: string | null; permalink?: string | null };
function externalWooCommerceProducts(item: ContentItem): WooCommercePlanningProduct[] {
  const references = item.planningMetadata?.externalProductReferences;
  if (!Array.isArray(references)) return [];
  return references.filter((value): value is WooCommercePlanningProduct =>
    Boolean(value && typeof value === "object" && (value as WooCommercePlanningProduct).provider === "woocommerce" && typeof (value as WooCommercePlanningProduct).name === "string")
  );
}

export default function MarketingContentClient() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [variantBusy, setVariantBusy] = useState<string | null>(null);
  const [copyBusy, setCopyBusy] = useState<number | null>(null);
  const [copyDrafts, setCopyDrafts] = useState<Record<number, string>>({});
  const [variantDrafts, setVariantDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [schedule, setSchedule] = useState<Record<number, string>>({});
  const [campaignFilter, setCampaignFilter] = useState<number | null>(null);
  const [contentFocus, setContentFocus] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/marketing/ai-status").then((response) => response.json()).then((data) => setAiEnabled(data.enabled === true)).catch(() => setAiEnabled(false));
    const params = new URLSearchParams(window.location.search);
    const value = params.get("campaignId");
    const nextCampaign = value && /^\d+$/.test(value) ? Number(value) : null;
    const contentValue = params.get("contentItemId");
    const nextContent = contentValue && /^\d+$/.test(contentValue) ? Number(contentValue) : null;
    // The URL initializes the selected campaign/content when opening this page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCampaignFilter(nextCampaign);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentFocus(nextContent);
    load(nextCampaign, nextContent);
  }, []);

  async function load(selectedCampaignId = campaignFilter, selectedContentId = contentFocus) {
    setLoading(true);
    try {
      const contentUrl = selectedCampaignId ? `/api/marketing/content-items?campaignId=${selectedCampaignId}` : "/api/marketing/content-items";
      const [contentResponse, accountResponse] = await Promise.all([fetch(contentUrl), fetch("/api/social-accounts")]);
      const contentData = await contentResponse.json(); const accountData = await accountResponse.json();
      if (!contentResponse.ok) throw new Error(contentData.error || "Failed to load content");
      if (!accountResponse.ok) throw new Error(accountData.error || "Failed to load accounts");
      if (!Array.isArray(contentData.contentItems)) throw new Error("Unexpected marketing content response");
      if (!Array.isArray(accountData)) throw new Error("Unexpected connected accounts response");
      const rawItems: ContentItem[] = [...contentData.contentItems];
      if (selectedContentId) {
        const focusedItem = rawItems.find((item) => item.id === selectedContentId);
        if (focusedItem && !selectedCampaignId && focusedItem.campaignId) {
          const focusedResponse = await fetch(`/api/marketing/content-items?campaignId=${focusedItem.campaignId}`);
          const focusedData = await focusedResponse.json();
          if (!focusedResponse.ok) throw new Error(focusedData.error || "Failed to load focused campaign content");
          if (!Array.isArray(focusedData.contentItems)) throw new Error("Unexpected focused content response");
          rawItems.splice(0, rawItems.length, ...focusedData.contentItems);
        }
      }
      const enriched = await Promise.all(rawItems.map(async (item) => {
        const response = await fetch(`/api/marketing/content-items/${item.id}/variants`);
        if (!response.ok) return item;
        const data = await response.json(); return { ...item, variants: data.variants || [] };
      }));
      setItems(enriched); setAccounts(accountData);
      setSelectedAccounts((current) => current.length ? current : accountData.map((a: Account) => a.id));
      const nextSchedule: Record<number, string> = {}; for (const item of rawItems) nextSchedule[item.id] = defaultSchedule(item.plannedFor); setSchedule(nextSchedule);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load marketing content"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [campaignFilter]);
  function toggleAccount(id: number) { setSelectedAccounts((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  async function approveContent(item: ContentItem) {
    setBusyId(item.id); setError(null);
    try {
      const response = await fetch(`/api/marketing/content-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to approve content");
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, status: data.contentItem.status } : value));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve content");
    } finally {
      setBusyId(null);
    }
  }

  async function generateBody(item: ContentItem) {
    setCopyBusy(item.id); setError(null);
    try {
      const response = await fetch("/api/marketing/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentItemId: item.id,
          contentType: item.contentType,
          format: item.format || "post",
          topic: item.topic || "",
          angle: item.angle || undefined,
          hook: item.hook || undefined,
          cta: item.cta || undefined,
          productIds: item.productIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate copy");
      setCopyDrafts((current) => ({ ...current, [item.id]: data.copy.body }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate copy");
    } finally {
      setCopyBusy(null);
    }
  }

  async function generateVariant(item: ContentItem, platform: Platform) {
    const key = `${item.id}:${platform}`; setVariantBusy(key); setError(null);
    try {
      const response = await fetch("/api/marketing/generate-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentItemId: item.id, contentType: item.contentType, format: item.format || "post", topic: item.topic || "", angle: item.angle || undefined, hook: item.hook || undefined, cta: item.cta || undefined, productIds: item.productIds, platform }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Failed to generate variant");
      setVariantDrafts((current) => ({ ...current, [key]: data.copy.body }));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to generate variant"); }
    finally { setVariantBusy(null); }
  }

  async function saveVariant(item: ContentItem, variant: Variant | null, platform: Platform) {
    const response = await fetch(`/api/marketing/content-items/${item.id}/variants`, {
      method: variant ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variant ? { variantId: variant.id, hook: variant.hook, body: variantDrafts[`${item.id}:${platform}`] ?? variant.body, cta: variant.cta, mediaId: variant.mediaId } : { platform, hook: null, body: variantDrafts[`${item.id}:${platform}`], cta: item.cta, mediaId: item.mediaId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to save variant");
    setItems((current) => current.map((value) => value.id === item.id
      ? { ...value, variants: variant ? (value.variants || []).map((v) => v.id === variant.id ? data.variant : v) : [...(value.variants || []).filter((v) => v.platform !== platform), data.variant] }
      : value));
    return data.variant as Variant;
  }

  async function createPost(item: ContentItem, variant: Variant) {
    const platformAccounts = selectedAccounts.filter((id) => accounts.find((a) => a.id === id)?.platform === variant.platform);
    if (platformAccounts.length === 0) { setError(`Select a connected ${platformLabel(variant.platform)} account to publish this variant.`); return; }
    setBusyId(item.id); setError(null);
    try {
      const savedVariant = await saveVariant(item, variant, variant.platform);
      const response = await fetch(`/api/marketing/content-items/${item.id}/create-post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedAccounts: platformAccounts, scheduleTime: new Date(schedule[item.id]).toISOString(), variantId: savedVariant.id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Failed to create post");
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, status: "converted", postIds: [...value.postIds, Number(data.post.id)], variants: (value.variants || []).map((v) => v.id === variant.id ? { ...v, status: "converted" } : v) } : value));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create post"); }
    finally { setBusyId(null); }
  }

  useEffect(() => {
    if (!contentFocus || loading) return;
    const target = document.getElementById(`content-item-${contentFocus}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [contentFocus, loading, items]);

  return (
    <DizitoPage>
      <DizitoPageHeader
        eyebrow="Content workflow"
        title="Marketing Content"
        description={campaignFilter ? "Work through this campaign's content: review the message, approve it, then schedule a platform version." : "Review your planned content, edit the message, approve it, and schedule it to the right social account."}
        action={!aiEnabled ? <DizitoBadge tone="neutral">AI writing · Coming soon</DizitoBadge> : <DizitoBadge tone="ai"><Sparkles size={13} /> AI writing available</DizitoBadge>}
      />
      <DizitoCard>
        <h2 className="text-base font-semibold text-slate-900">How to use this page</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          <li className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">1</span><span><strong className="block text-sm text-slate-900">Review the message</strong><span className="text-xs text-slate-600">Edit the main copy to fit your business.</span></span></li>
          <li className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">2</span><span><strong className="block text-sm text-slate-900">Approve it</strong><span className="text-xs text-slate-600">Mark the content ready before scheduling.</span></span></li>
          <li className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">3</span><span><strong className="block text-sm text-slate-900">Choose a channel and time</strong><span className="text-xs text-slate-600">Review a platform version and schedule it.</span></span></li>
        </ol>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button type="button" aria-expanded={accountsOpen} onClick={() => setAccountsOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-800">
            <span>Publishing accounts <span className="font-normal text-slate-500">({selectedAccounts.length} selected of {accounts.length})</span></span>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs">{accountsOpen ? "Hide accounts" : "Choose accounts"}</span>
          </button>
          {accountsOpen && <div className="mt-3 flex flex-wrap gap-2">{accounts.map((account) => { const selected = selectedAccounts.includes(account.id); return <button key={account.id} onClick={() => toggleAccount(account.id)} aria-pressed={selected} className={`rounded-full border px-3 py-2 text-sm ${selected ? "border-violet-600 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600"}`}>{selected ? "✓ " : ""}{platformLabel(account.platform)} · {account.account_name}</button>; })}{accounts.length === 0 && <p className="text-sm text-slate-500">No connected social accounts yet. Connect one in Social Accounts before scheduling.</p>}</div>}
        </div>
      </DizitoCard>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <DizitoCard><div className="animate-pulse space-y-3"><div className="h-6 w-1/3 rounded bg-slate-100" /><div className="h-20 rounded-2xl bg-slate-100" /><div className="h-20 rounded-2xl bg-slate-100" /></div></DizitoCard> : items.length === 0 ? <DizitoState kind="empty" title={campaignFilter ? "No content for this campaign" : "No content items yet"} description={campaignFilter ? "Generate content for this campaign from the weekly planning flow." : "Generate and approve a weekly plan first; nothing is published automatically."} /> : <div className="space-y-4">{items.map((item) => <article key={item.id} id={`content-item-${item.id}`} className="dizito-card"><details className="group"><summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden"><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><span>{item.contentType}</span><span>·</span><span>{item.format || "content"}</span><span className={`rounded-full px-2 py-0.5 normal-case tracking-normal ${item.status === "ready" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{item.status === "ready" ? "Approved" : item.status === "converted" ? "Scheduled / converted" : "Needs review"}</span></span><span className="mt-1 block text-base font-semibold text-slate-900">{item.topic || item.hook || "Untitled content item"}</span><span className="mt-1 block truncate text-xs text-slate-500">{item.campaignName || "Campaign"}{item.productNames.length ? " · " + item.productNames.join(", ") : ""}</span></span><span className="mt-1 shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 group-open:hidden">Review</span><span className="mt-1 hidden shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 group-open:inline">Collapse</span></summary><div className="mt-4 border-t border-slate-100 pt-4"><div className="flex flex-col gap-4"><div><div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><span>{item.contentType}</span><span>·</span><span>{item.format || "content"}</span>{item.status === "converted" && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-green-700 normal-case tracking-normal"><CheckCircle2 size={13} /> Converted</span>}</div><h2 className="mt-2 text-lg font-semibold text-gray-900">{item.topic || item.hook || "Untitled content item"}</h2>
<div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
  <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Campaign strategy</div>
  <div className="mt-1 text-sm font-semibold text-gray-900">{item.campaignName || "Campaign"}</div>
  <div className="mt-1 grid gap-1 text-xs text-gray-600 sm:grid-cols-3">
    {item.campaignObjective && <div><span className="font-medium text-gray-700">Objective:</span> {item.campaignObjective}</div>}
    {item.campaignAudience && <div><span className="font-medium text-gray-700">Audience:</span> {item.campaignAudience}</div>}
    {item.campaignCta && <div><span className="font-medium text-gray-700">CTA:</span> {item.campaignCta}</div>}
    {item.productNames.length > 0 && <div><span className="font-medium text-gray-700">Products:</span> {item.productNames.join(", ")}</div>}
    {item.offerName && <div><span className="font-medium text-gray-700">Offer:</span> {item.offerName}</div>}
  </div>
</div>{externalWooCommerceProducts(item).length > 0 && <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Linked WooCommerce products</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{externalWooCommerceProducts(item).map((product, index) => <div key={`${product.externalProductId ?? product.name}-${index}`} className="rounded-lg border border-emerald-100 bg-white/80 p-3"><div className="font-semibold text-gray-900">{product.name}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">{product.sku && <span>SKU: {product.sku}</span>}{product.priceSnapshot && <span>Price snapshot: {product.priceSnapshot}</span>}{product.stockStatusSnapshot && <span>Stock snapshot: {product.stockStatusSnapshot.replaceAll("_", " ")}</span>}</div><div className="mt-1 text-[11px] text-gray-500">External product #{product.externalProductId ?? "—"} · captured during planning; verify current price and availability before publishing.</div>{product.permalink && <a href={product.permalink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline">View product</a>}</div>)}</div></div>}{Object.keys(item.planningMetadata ?? {}).length > 0 && <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-xs text-amber-900"><div className="font-semibold uppercase tracking-wide text-amber-700">Planning provenance</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{item.planningMetadata.sourceCampaignId != null && <Link href={"/campaigns?focus=" + String(item.planningMetadata.sourceCampaignId)} className="underline">Source campaign #{String(item.planningMetadata.sourceCampaignId)}</Link>}{Array.isArray(item.planningMetadata.supportingExperimentIds) && item.planningMetadata.supportingExperimentIds.length > 0 && <span>Supporting experiments: {item.planningMetadata.supportingExperimentIds.map((id) => <Link key={String(id)} href={"/experiments?focus=" + String(id)} className="ml-1 underline">#{String(id)}</Link>)}</span>}</div></div>}<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{displayCopy(item) || "No generic copy yet."}</p>{copyDrafts[item.id] && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">Editable copy · review before saving</div><textarea value={copyDrafts[item.id]} onChange={(event) => setCopyDrafts((current) => ({ ...current, [item.id]: event.target.value }))} rows={6} className="w-full rounded-lg border border-blue-200 bg-white p-3 text-sm" disabled={item.status === "converted"} /><div className="mt-2 flex gap-2"><button onClick={async () => { setCopyBusy(item.id); setError(null); try { const response = await fetch(`/api/marketing/content-items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: copyDrafts[item.id], status: item.status === "draft" ? "ready" : item.status }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Failed to save copy"); setItems((current) => current.map((value) => value.id === item.id ? { ...value, body: data.contentItem.body, status: data.contentItem.status } : value)); setCopyDrafts((current) => { const next = { ...current }; delete next[item.id]; return next; }); } catch (err) { setError(err instanceof Error ? err.message : "Failed to save copy"); } finally { setCopyBusy(null); } }} disabled={copyBusy === item.id || item.status === "converted"} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save reviewed copy</button><button onClick={() => setCopyDrafts((current) => { const next = { ...current }; delete next[item.id]; return next; })} className="rounded-lg border px-3 py-2 text-xs font-medium">Discard draft</button></div></div>}<div className="flex flex-wrap items-center gap-2">{copyDrafts[item.id] === undefined && <button onClick={() => setCopyDrafts((current) => ({ ...current, [item.id]: item.body || [item.hook, item.topic ? `About ${item.topic}. [Add useful, accurate details for your audience.]` : "[Write your main message here.]", item.cta].filter(Boolean).join("\n\n") }))} disabled={item.status === "converted"} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50">Edit copy manually</button>}<button onClick={() => generateBody(item)} disabled={!aiEnabled || copyBusy === item.id || item.status === "converted"} title={!aiEnabled ? "AI copy is coming soon; use manual templates" : "Generate copy with AI"} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50">{copyBusy === item.id ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}{!aiEnabled ? "AI copy · Coming soon" : item.body ? "Rewrite AI copy" : "Generate AI copy"}</button>{item.status === "planned" && <button onClick={() => approveContent(item)} disabled={busyId === item.id} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busyId === item.id ? "Approving..." : "Approve for scheduling"}</button>}{item.status === "ready" && <span className="rounded-full bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700">Approved · ready to schedule</span>}</div></div>
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
            <span>Platform versions <span className="font-normal text-slate-500">· edit and schedule per network</span></span>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Open versions</span>
          </summary>
          <div className="border-t border-slate-100 p-3 sm:p-4">
        <div className="rounded-xl border bg-gray-50 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-gray-900">Channel variants</h3><p className="text-xs text-gray-500">Each variant is reviewed independently and can only publish to its own platform.</p></div><Sparkles size={17} className="text-blue-600" /></div><div className="grid gap-3 lg:grid-cols-2">{PLATFORMS.map((platform) => { const variant = (item.variants || []).find((v) => v.platform === platform); const key = `${item.id}:${platform}`; const platformAccounts = accounts.filter((a) => selectedAccounts.includes(a.id) && a.platform === platform); return <div key={platform} className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between gap-2"><div className="text-sm font-semibold text-gray-800">{platformLabel(platform)}</div>{variant?.status === "converted" && <span className="text-xs text-green-700">Published as Post</span>}</div>{<><textarea value={variantDrafts[key] ?? variant?.body ?? ""} onChange={(event) => setVariantDrafts((current) => ({ ...current, [key]: event.target.value }))} rows={5} className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-sm" disabled={variant?.status === "converted"} />{variantDrafts[key] !== undefined && <div className="mt-2 text-[11px] font-semibold text-blue-700">AI draft — review before saving.</div>}<div className="mt-2 flex gap-2"><button onClick={() => generateVariant(item, platform)} disabled={!aiEnabled || variantBusy === key || variant?.status === "converted"} title={!aiEnabled ? "AI channel variants are coming soon; edit the text above manually" : "Generate a channel variant"} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50">{variantBusy === key ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}{!aiEnabled ? "AI · Coming soon" : variant?.body ? "Rewrite" : "Generate"}</button>{variantDrafts[key] !== undefined ? <button onClick={async () => { try { await saveVariant(item, variant ?? null, platform); setVariantDrafts((current) => { const next = { ...current }; delete next[key]; return next; }); } catch (err) { setError(err instanceof Error ? err.message : "Failed to save variant"); } }} disabled={variant?.status === "converted" || variantBusy === key} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save reviewed variant</button> : <button onClick={() => variant && createPost(item, variant)} disabled={!variant || variant.status === "converted" || busyId === item.id || platformAccounts.length === 0} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Send size={13} />{platformAccounts.length ? "Schedule" : "Connect account"}</button>}</div></>}</div>; })}</div></div>
          </div>
        </details>
        <div className="grid max-w-md gap-2"><label className="text-sm font-medium text-gray-700">Schedule time</label><input type="datetime-local" value={schedule[item.id] || ""} onChange={(event) => setSchedule((current) => ({ ...current, [item.id]: event.target.value }))} className="w-full rounded-xl border border-gray-300 p-3" disabled={item.status === "converted"} /></div>
      </div></div></details></article>)}</div>}
    </DizitoPage>
  );
}
