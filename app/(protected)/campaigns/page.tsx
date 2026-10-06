"use client";

import { useEffect, useState } from "react";

type Campaign = {
  id: number; name: string; status: string; objective: string | null; audience: string | null; cta: string | null;
  goalId: number | null; offerId: number | null; productIds: number[]; postIds: number[]; startsAt: string | null; endsAt: string | null;
};
type Brain = {
  goals: { id: number; name: string; status: string }[];
  offers: { id: number; name: string; status: string }[];
  products: { id: number; name: string; status?: string }[];
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brain, setBrain] = useState<Brain | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", objective: "", audience: "", cta: "", goalId: "", offerId: "", productIds: [] as number[] });

  async function load() {
    setLoading(true);
    try {
      const [campaignResponse, brainResponse] = await Promise.all([
        fetch("/api/marketing/campaigns"),
        fetch("/api/marketing/business-brain"),
      ]);
      const campaignData = await campaignResponse.json();
      const brainData = await brainResponse.json();
      if (!campaignResponse.ok) throw new Error(campaignData.error || "Failed to load campaigns");
      if (!brainResponse.ok) throw new Error(brainData.error || "Failed to load Business Brain");
      setCampaigns(campaignData.campaigns || []);
      setBrain(brainData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load campaigns");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function toggleProduct(id: number) {
    setForm((current) => ({ ...current, productIds: current.productIds.includes(id) ? current.productIds.filter((value) => value !== id) : [...current.productIds, id] }));
  }

  async function createCampaign() {
    if (!form.name.trim()) { setMessage("Campaign name is required."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, objective: form.objective || null, audience: form.audience || null, cta: form.cta || null,
          goalId: form.goalId ? Number(form.goalId) : null, offerId: form.offerId ? Number(form.offerId) : null,
          productIds: form.productIds, status: "draft",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create campaign");
      setForm({ name: "", objective: "", audience: "", cta: "", goalId: "", offerId: "", productIds: [] });
      setMessage("Campaign created as a draft.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to create campaign"); }
    finally { setSaving(false); }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 24 }}>
      <header>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Marketing Strategy</p>
        <h1 style={{ margin: "8px 0" }}>Campaigns</h1>
        <p style={{ maxWidth: 760, opacity: 0.7 }}>Manage the strategy layer that connects goals, offers and products to Content Items. Campaigns do not publish by themselves.</p>
      </header>

      {message && <div style={{ padding: 12, borderRadius: 8, background: "#f4f4f4" }}>{message}</div>}

      <section style={{ padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Create campaign</h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          <input placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: 10 }} />
          <select value={form.goalId} onChange={(e) => setForm({ ...form, goalId: e.target.value })} style={{ padding: 10 }}>
            <option value="">No goal</option>{(brain?.goals || []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={form.offerId} onChange={(e) => setForm({ ...form, offerId: e.target.value })} style={{ padding: 10 }}>
            <option value="">No offer</option>{(brain?.offers || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input placeholder="Objective" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} style={{ padding: 10 }} />
          <input placeholder="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} style={{ padding: 10 }} />
          <input placeholder="CTA" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} style={{ padding: 10 }} />
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Products</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(brain?.products || []).map((product) => {
            const selected = form.productIds.includes(product.id);
            return <button type="button" key={product.id} onClick={() => toggleProduct(product.id)} style={{ padding: "7px 10px", borderRadius: 999, border: "1px solid #ccc", background: selected ? "#eef6ff" : "white", fontWeight: selected ? 700 : 400 }}>{product.name}</button>;
          })}</div>
        </div>
        <button onClick={createCampaign} disabled={saving} style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, border: 0, fontWeight: 700 }}>{saving ? "Creating…" : "Create draft campaign"}</button>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ marginBottom: 0 }}>Campaign workspace</h2>
        {loading ? <p>Loading campaigns…</p> : campaigns.length === 0 ? <div style={{ padding: 28, border: "1px dashed #bbb", borderRadius: 12 }}>No campaigns yet. Create one above or approve a generated week.</div> :
          campaigns.map((campaign) => <article key={campaign.id} style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><strong>{campaign.name}</strong><div style={{ marginTop: 4, fontSize: 13, opacity: 0.65 }}>Campaign #{campaign.id}</div></div><span style={{ fontSize: 12, fontWeight: 700 }}>{campaign.status}</span></div>
            <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 14 }}>
              {campaign.objective && <div><strong>Objective:</strong> {campaign.objective}</div>}
              {campaign.audience && <div><strong>Audience:</strong> {campaign.audience}</div>}
              {campaign.cta && <div><strong>CTA:</strong> {campaign.cta}</div>}
              <div><strong>Products:</strong> {campaign.productIds.length}</div>
              <div><strong>Scheduled Posts:</strong> {campaign.postIds.length}</div>
            </div>
          </article>)}
      </section>
    </main>
  );
}
