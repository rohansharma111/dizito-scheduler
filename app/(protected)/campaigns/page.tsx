"use client";

import { useEffect, useState } from "react";
import { DizitoBadge, DizitoButton, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

type Campaign = {
  id: number; name: string; status: string; objective: string | null; audience: string | null; cta: string | null;
  goalId: number | null; offerId: number | null; productIds: number[]; postIds: number[]; contentReadiness: { total: number; needsApproval: number; readyToSchedule: number; converted: number }; experimentSummary: { total: number; running: number; completed: number; planned: number }; experimentLearning: { id: number; name: string; metric: string; learningSignal: "positive" | "negative" | "insufficient"; resultSummary: string | null }[]; observedImpact: { actionCount: number; actionValue: number; linkedOrderCount: number; linkedOrderValue: number; attributedActionCount: number; attributedValue: number; attributedOrderCount: number; attributedActionBreakdown: Array<{ actionType: string; count: number; value: number }> }; contentItemCounts: { draft: number; planned: number; ready: number; converted: number; archived: number };
};
type ContentItem = { id: number; contentType: string; format: string | null; topic: string | null; status: string; plannedFor: string | null; productNames: string[] };
type Brain = {
  goals: { id: number; name: string; status: string }[];
  offers: { id: number; name: string; status: string }[];
  products: { id: number; name: string; status?: string }[];
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brain, setBrain] = useState<Brain | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", objective: "", audience: "", cta: "", goalId: "", offerId: "", productIds: [] as number[] });
  const [contentForm, setContentForm] = useState({ contentType: "social_post", format: "social_post", topic: "", cta: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [campaignResponse, brainResponse] = await Promise.all([fetch("/api/marketing/campaigns"), fetch("/api/marketing/business-brain")]);
      const campaignData = await campaignResponse.json();
      const brainData = await brainResponse.json();
      if (!campaignResponse.ok) throw new Error(campaignData.error || "Failed to load campaigns");
      if (!brainResponse.ok) throw new Error(brainData.error || "Failed to load Business Brain");
      setCampaigns(campaignData.campaigns || []);
      setBrain(brainData);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to load campaigns"); }
    finally { setLoading(false); }
  }

  async function loadContent(campaignId: number) {
    setSelectedId(campaignId);
    const response = await fetch("/api/marketing/content-items?campaignId=" + campaignId);
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Failed to load content items"); return; }
    setItems(data.contentItems || []);
  }

  useEffect(() => {
    load().then(() => {
      const focus = new URLSearchParams(window.location.search).get("focus");
      const id = focus ? Number(focus) : null;
      if (id && Number.isInteger(id) && id > 0) {
        setSelectedId(id);
        loadContent(id);
      }
    });
  }, []);

  function toggleProduct(id: number) {
    setForm((current) => ({ ...current, productIds: current.productIds.includes(id) ? current.productIds.filter((value) => value !== id) : [...current.productIds, id] }));
  }

  async function createCampaign() {
    if (!form.name.trim()) { setMessage("Campaign name is required."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/marketing/campaigns", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, objective: form.objective || null, audience: form.audience || null, cta: form.cta || null, goalId: form.goalId ? Number(form.goalId) : null, offerId: form.offerId ? Number(form.offerId) : null, productIds: form.productIds, status: "draft" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create campaign");
      setForm({ name: "", objective: "", audience: "", cta: "", goalId: "", offerId: "", productIds: [] });
      setMessage("Campaign created as a draft."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to create campaign"); }
    finally { setSaving(false); }
  }

  function beginEdit(campaign: Campaign) {
    setEditingId(campaign.id);
    setForm({ name: campaign.name, objective: campaign.objective || "", audience: campaign.audience || "", cta: campaign.cta || "", goalId: campaign.goalId ? String(campaign.goalId) : "", offerId: campaign.offerId ? String(campaign.offerId) : "", productIds: campaign.productIds });
  }

  async function updateStatus(campaign: Campaign, status: string) {
    setSaving(true); setMessage("");
    try { const response = await fetch("/api/marketing/campaigns/" + campaign.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Failed to update campaign status"); setMessage("Campaign status updated."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Failed to update campaign status"); } finally { setSaving(false); }
  }

  async function saveCampaign() {
    if (!editingId || !form.name.trim()) { setMessage("Campaign name is required."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/marketing/campaigns/" + editingId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, objective: form.objective || null, audience: form.audience || null, cta: form.cta || null, goalId: form.goalId ? Number(form.goalId) : null, offerId: form.offerId ? Number(form.offerId) : null, productIds: form.productIds }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update campaign");
      setEditingId(null);
      setMessage("Campaign updated.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to update campaign"); }
    finally { setSaving(false); }
  }

  async function createContent() {
    if (!selectedId || !contentForm.topic.trim()) { setMessage("Select a campaign and add a topic."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/marketing/content-items", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedId, contentType: contentForm.contentType, format: contentForm.format, topic: contentForm.topic, cta: contentForm.cta || null, status: "planned" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create content item");
      setContentForm({ contentType: "social_post", format: "social_post", topic: "", cta: "" });
      setMessage("Content Item added as planned. It must be approved before scheduling.");
      await Promise.all([loadContent(selectedId), load()]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to create content item"); }
    finally { setSaving(false); }
  }

  return (
    <DizitoPage>
      <DizitoPageHeader eyebrow="Marketing strategy" title="Campaigns" description="Connect goals, offers and products to Content Items. Campaigns do not publish by themselves." />
      {message && <DizitoCard tone="soft"><div className="text-sm font-medium">{message}</div></DizitoCard>}

      <DizitoCard>
        <h2 style={{ marginTop: 0 }}>Create campaign</h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          <input placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <select value={form.goalId} onChange={(e) => setForm({ ...form, goalId: e.target.value })} style={{ padding: 10 }}><option value="">No goal</option>{(brain?.goals || []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <select value={form.offerId} onChange={(e) => setForm({ ...form, offerId: e.target.value })} style={{ padding: 10 }}><option value="">No offer</option>{(brain?.offers || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
          <input placeholder="Objective" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} style={{ padding: 10 }} />
          <input placeholder="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} style={{ padding: 10 }} />
          <input placeholder="CTA" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} style={{ padding: 10 }} />
        </div>
        <div style={{ marginTop: 14 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Products</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(brain?.products || []).map((product) => {
          const selected = form.productIds.includes(product.id);
          return <button type="button" key={product.id} onClick={() => toggleProduct(product.id)} className={`dizito-badge ${selected ? "dizito-badge-ai" : "dizito-badge-neutral"} cursor-pointer border-0`}>{product.name}</button>;
        })}</div></div>
        <button onClick={createCampaign} disabled={saving} className="dizito-button dizito-button-primary mt-4">{saving ? "Creating…" : "Create draft campaign"}</button>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ marginBottom: 0 }}>Campaign workspace</h2>
        {loading ? <p>Loading campaigns…</p> : campaigns.length === 0 ? <DizitoState kind="empty" title="No campaigns yet" description="Create one above or approve a generated week to start organizing strategy." /> :
          campaigns.map((campaign) => <DizitoCard key={campaign.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><strong>{campaign.name}</strong><div style={{ marginTop: 4, fontSize: 13, opacity: 0.65 }}>Campaign #{campaign.id}</div></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><DizitoBadge tone={campaign.status === "active" ? "success" : campaign.status === "paused" ? "warning" : "neutral"}>{campaign.status}</DizitoBadge>{campaign.status === "draft" && <button type="button" disabled={saving} onClick={() => updateStatus(campaign, "planned")} className="dizito-button dizito-button-secondary !min-h-8 !px-3 !text-xs">Plan</button>}{campaign.status === "planned" && <button type="button" disabled={saving} onClick={() => updateStatus(campaign, "active")} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #bbb" }}>Activate</button>}{campaign.status === "active" && <button type="button" disabled={saving} onClick={() => updateStatus(campaign, "paused")} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #bbb" }}>Pause</button>}{campaign.status === "paused" && <button type="button" disabled={saving} onClick={() => updateStatus(campaign, "active")} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #bbb" }}>Resume</button>}</div></div>
            <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 14 }}>
              {campaign.objective && <div><strong>Objective:</strong> {campaign.objective}</div>}
              {campaign.audience && <div><strong>Audience:</strong> {campaign.audience}</div>}
              {campaign.cta && <div><strong>CTA:</strong> {campaign.cta}</div>}
              <div><strong>Products:</strong> {campaign.productIds.length}</div>
              <div><strong>Scheduled Posts:</strong> {campaign.postIds.length}</div>
              <div><strong>Content:</strong> {campaign.contentItemCounts.draft} draft · {campaign.contentItemCounts.planned} planned · {campaign.contentItemCounts.ready} ready · {campaign.contentItemCounts.converted} converted · {campaign.contentItemCounts.archived} archived</div>
              <div><strong>Readiness:</strong> {campaign.contentReadiness.total} active items · {campaign.contentReadiness.needsApproval} need approval · {campaign.contentReadiness.readyToSchedule} ready to schedule · {campaign.contentReadiness.converted} converted</div>
              <div><strong>Experiments:</strong> {campaign.experimentSummary.total} total · {campaign.experimentSummary.running} running · {campaign.experimentSummary.planned} planned · {campaign.experimentSummary.completed} completed</div>
              {campaign.experimentLearning.length > 0 && (
                <div className="mt-2">
                  <strong>Learning:</strong>
                  {campaign.experimentLearning.map((experiment) => (
                    <a key={experiment.id} href={`/experiments?focus=${experiment.id}`} className="ml-2 underline">
                      {experiment.name} · {experiment.learningSignal}
                    </a>
                  ))}
                </div>
              )}
              <div><a href={`/experiments?campaignId=${campaign.id}`} style={{ textDecoration: "none", fontWeight: 700 }}>View campaign experiments</a></div>
              <div><strong>Observed impact:</strong> {campaign.observedImpact.actionCount} completed actions · value {campaign.observedImpact.actionValue} · {campaign.observedImpact.linkedOrderCount} linked orders · order value {campaign.observedImpact.linkedOrderValue}</div>
              <div><strong>Manual attribution:</strong> {campaign.observedImpact.attributedActionCount} attributed actions · value {campaign.observedImpact.attributedValue} · {campaign.observedImpact.attributedOrderCount} attributed orders</div>
            </div>
            {campaign.observedImpact.attributedActionBreakdown.length > 0 && (
              <div>
                <strong>Action breakdown:</strong>{" "}
                {campaign.observedImpact.attributedActionBreakdown.map((action) => (
                  <span key={action.actionType} style={{ marginRight: 8 }}>
                    {action.actionType} {action.count}{action.value ? ` (value ${action.value})` : ""}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}><button type="button" onClick={() => loadContent(campaign.id)} className="dizito-button dizito-button-secondary !min-h-9 !px-3 !text-xs">{selectedId === campaign.id ? "Refresh Content Items" : "Open Content Items"}</button><a href={`/marketing-content?campaignId=${campaign.id}`} className="dizito-button dizito-button-secondary !min-h-9 !px-3 !text-xs no-underline">{campaign.contentReadiness.needsApproval > 0 ? `Review ${campaign.contentReadiness.needsApproval} pending` : "Open review"}</a><button type="button" onClick={() => beginEdit(campaign)} className="dizito-button dizito-button-secondary !min-h-9 !px-3 !text-xs">Edit campaign</button></div>
            {editingId === campaign.id && <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #eee", display: "grid", gap: 10 }}><strong>Edit campaign strategy</strong><div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" /><input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Objective" style={{ padding: 9 }} /><input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Audience" style={{ padding: 9 }} /><input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="CTA" style={{ padding: 9 }} /><select value={form.goalId} onChange={(e) => setForm({ ...form, goalId: e.target.value })} style={{ padding: 9 }}><option value="">No goal</option>{(brain?.goals || []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={form.offerId} onChange={(e) => setForm({ ...form, offerId: e.target.value })} style={{ padding: 9 }}><option value="">No offer</option>{(brain?.offers || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(brain?.products || []).map((product) => <button type="button" key={product.id} onClick={() => toggleProduct(product.id)} className={`dizito-badge ${form.productIds.includes(product.id) ? "dizito-badge-ai" : "dizito-badge-neutral"} cursor-pointer border-0`}>{product.name}</button>)}</div><div><button type="button" onClick={saveCampaign} disabled={saving} className="dizito-button dizito-button-primary !min-h-9 !px-3 !text-xs">{saving ? "Saving…" : "Save campaign"}</button><button type="button" onClick={() => setEditingId(null)} className="dizito-button dizito-button-secondary !ml-2 !min-h-9 !px-3 !text-xs">Cancel</button></div></div>}
            {selectedId === campaign.id && <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #eee", display: "grid", gap: 12 }}>
              <div><strong>Campaign content</strong><p style={{ margin: "4px 0", fontSize: 13, opacity: 0.65 }}>Content follows the campaign strategy and remains reviewable before scheduling.</p></div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                <input value={contentForm.contentType} onChange={(e) => setContentForm({ ...contentForm, contentType: e.target.value })} placeholder="Content type" style={{ padding: 9 }} />
                <input value={contentForm.format} onChange={(e) => setContentForm({ ...contentForm, format: e.target.value })} placeholder="Format" style={{ padding: 9 }} />
                <input value={contentForm.topic} onChange={(e) => setContentForm({ ...contentForm, topic: e.target.value })} placeholder="Topic" style={{ padding: 9 }} />
                <input value={contentForm.cta} onChange={(e) => setContentForm({ ...contentForm, cta: e.target.value })} placeholder="CTA (optional)" style={{ padding: 9 }} />
              </div>
              <button type="button" onClick={createContent} disabled={saving} className="dizito-button dizito-button-primary justify-self-start !min-h-9 !px-3 !text-xs">{saving ? "Saving…" : "Add planned Content Item"}</button>
              {items.length === 0 ? <p style={{ margin: 0, fontSize: 13, opacity: 0.65 }}>No Content Items yet.</p> : items.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"><div><strong>{item.topic || "Untitled content"}</strong><div style={{ marginTop: 4, fontSize: 13, opacity: 0.65 }}>{item.contentType}{item.format ? " · " + item.format : ""}{item.productNames.length ? " · " + item.productNames.join(", ") : ""}</div></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{item.status}</span>{(item.status === "draft" || item.status === "planned") && <a href={`/marketing-content?campaignId=${campaign.id}`} className="dizito-button dizito-button-secondary !min-h-8 !px-2.5 !text-xs no-underline">Review</a>}{item.status === "ready" && <a href={`/marketing-content?campaignId=${campaign.id}`} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #bbb", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>Schedule</a>}{item.status === "converted" && <span style={{ fontSize: 12, opacity: 0.65 }}>Converted</span>}</div></div>)}
            </div>}
          </article>)}
      </section>
    </main>
  );
}
