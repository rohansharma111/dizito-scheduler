"use client";

import { useEffect, useMemo, useState } from "react";

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

  const weekEnd = useMemo(() => {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  }, [weekStart]);

  async function generate() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/marketing/weekly-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate week");
      setPlan(data.weeklyPlan ?? data.plan ?? data);
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
    try {
      const response = await fetch("/api/marketing/weekly-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          weekEnd,
          status: "approved",
          strategySummary: plan.strategySummary ?? plan.strategy_summary ?? plan.objective ?? "Weekly marketing plan",
          planPayload: plan.planPayload ?? plan.plan_payload ?? plan,
          campaignIds: Array.isArray(plan.campaignIds) ? plan.campaignIds : [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to approve week");
      setPlan(data.weeklyPlan ?? data);
      setMessage("Week approved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve week");
    } finally {
      setSaving(false);
    }
  }

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
        <button onClick={generate} disabled={loading} style={{ padding: "12px 18px", borderRadius: 9, border: 0, cursor: loading ? "wait" : "pointer", fontWeight: 700 }}>
          {loading ? "Generating…" : "Generate My Week"}
        </button>
        {plan && <button onClick={approve} disabled={saving} style={{ padding: "12px 18px", borderRadius: 9, border: "1px solid #bbb", cursor: saving ? "wait" : "pointer", fontWeight: 700 }}>
          {saving ? "Approving…" : "Approve Week"}
        </button>}
      </section>

      {message && <div style={{ marginBottom: 24, padding: 12, borderRadius: 8, background: "#f4f4f4" }}>{message}</div>}

      {!plan && <section style={{ padding: 28, border: "1px dashed #bbb", borderRadius: 12 }}><strong>Your week is not planned yet.</strong><p style={{ opacity: 0.7 }}>Generate a recommendation first. Nothing is published automatically.</p></section>}

      {plan && <section style={{ display: "grid", gap: 16 }}>
        <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>{plan.objective ?? plan.strategySummary ?? "Your weekly marketing plan"}</h2>
          {plan.rationale && <p style={{ opacity: 0.75 }}>{plan.rationale}</p>}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {(plan.items ?? plan.recommendations ?? plan.contentItems ?? []).map((item: any, index: number) => (
            <article key={item.id ?? index} style={{ padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{dayNames[index] ?? `Day ${index + 1}`}</strong>
                <span style={{ opacity: 0.6 }}>{item.contentType ?? item.content_type ?? "Content"}</span>
              </div>
              <h3 style={{ marginBottom: 8 }}>{item.topic ?? item.title ?? item.hook ?? "Marketing content"}</h3>
              {item.hook && <p><strong>Hook:</strong> {item.hook}</p>}
              {item.cta && <p><strong>CTA:</strong> {item.cta}</p>}
              {item.rationale && <p style={{ opacity: 0.7 }}>{item.rationale}</p>}
              {(item.channels ?? item.suggestedChannels ?? []).length > 0 && <p style={{ fontSize: 13, opacity: 0.65 }}>Channels: {(item.channels ?? item.suggestedChannels).join(", ")}</p>}
            </article>
          ))}
        </div>
      </section>}
    </main>
  );
}
