"use client";

import { useMemo, useState } from "react";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function mondayDate() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function GenerateMyWeekPage() {
  const [weekStart, setWeekStart] = useState(mondayDate());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [approved, setApproved] = useState(false);

  const weekEnd = useMemo(() => {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  }, [weekStart]);

  async function generate() {
    setLoading(true);
    setMessage("");
    setApproved(false);
    try {
      const response = await fetch("/api/marketing/weekly-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate week");
      setPlan(data.generatedWeek);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate week");
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    if (!plan) return;
    setSaving(true);
    setMessage("");

    const recommendations = Array.isArray(plan.recommendations) ? plan.recommendations : [];
    const first = recommendations[0];
    const strategy = {
      strategySummary: plan.strategySummary,
      campaigns: [
        {
          name: `Weekly ${plan.weekStart} marketing campaign`,
          objective: first?.objective ?? "Drive consistent marketing activity",
          audience: "Existing and prospective customers",
          offerId: first?.offerId ?? null,
          productIds: [...new Set(recommendations.map((item: any) => item.productId).filter((id: unknown): id is number => typeof id === "number"))],
          cta: first?.cta ?? "Get started",
          channelStrategy: { platforms: [...new Set(recommendations.flatMap((item: any) => item.suggestedChannels ?? []))] },
          contentItems: recommendations.map((item: any) => ({
            contentType: item.contentType,
            format: "social_post",
            topic: item.topic,
            angle: item.objective,
            hook: item.hook,
            body: null,
            cta: item.cta,
            mediaId: item.mediaId ?? null,
            plannedFor: item.day,
          })),
        },
      ],
    };

    try {
      const response = await fetch("/api/marketing/weekly-plans/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, weekEnd, strategy }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to approve week");
      setApproved(true);
      setMessage("Week approved. Campaign and Content Items are ready for review; nothing has been published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve week");
    } finally {
      setSaving(false);
    }
  }

  const recommendations = plan?.recommendations ?? [];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>AI Marketing Operator</p>
          <h1 style={{ margin: "8px 0", fontSize: 36 }}>Generate My Week</h1>
          <p style={{ margin: 0, maxWidth: 680, opacity: 0.7 }}>Use your Business Brain, goals, products, offers, media and recent marketing activity to create a reviewable weekly plan.</p>
        </div>
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Week starts
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
      </div>

      <section style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        <button onClick={generate} disabled={loading || saving} style={{ padding: "12px 18px", borderRadius: 9, border: 0, cursor: loading ? "wait" : "pointer", fontWeight: 700 }}>
          {loading ? "Generating…" : "Generate My Week"}
        </button>
        {plan && !approved && <button onClick={approve} disabled={saving || recommendations.length === 0} style={{ padding: "12px 18px", borderRadius: 9, border: "1px solid #bbb", cursor: saving ? "wait" : "pointer", fontWeight: 700 }}>
          {saving ? "Approving…" : "Approve Week"}
        </button>}
      </section>

      {message && <div style={{ marginBottom: 24, padding: 12, borderRadius: 8, background: "#f4f4f4" }}>{message}</div>}

      {!plan && <section style={{ padding: 28, border: "1px dashed #bbb", borderRadius: 12 }}><strong>Your week is not planned yet.</strong><p style={{ opacity: 0.7 }}>Generate a recommendation first. Nothing is published automatically.</p></section>}

      {plan && <section style={{ display: "grid", gap: 16 }}>
        <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>{plan.strategySummary}</h2>
          <p style={{ marginBottom: 0, opacity: 0.7 }}>Review the recommendations below before approving. Approval creates a planned campaign and Content Items; it does not schedule or publish posts.</p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {recommendations.map((item: any, index: number) => (
            <article key={`${item.day}-${index}`} style={{ padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{dayNames[index] ?? item.day}</strong>
                <span style={{ opacity: 0.6 }}>{item.contentType}</span>
              </div>
              <h3 style={{ marginBottom: 8 }}>{item.topic}</h3>
              <p><strong>Hook:</strong> {item.hook}</p>
              <p><strong>CTA:</strong> {item.cta}</p>
              <p style={{ opacity: 0.7 }}>{item.rationale}</p>
              {item.suggestedChannels?.length > 0 && <p style={{ fontSize: 13, opacity: 0.65 }}>Channels: {item.suggestedChannels.join(", ")}</p>}
            </article>
          ))}
        </div>
      </section>}
    </main>
  );
}
