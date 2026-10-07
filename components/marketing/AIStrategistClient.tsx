"use client";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type Strategy = {
  strategySummary: string;
  priorities: Array<{ priority: string; rationale: string; goalId: number | null; campaignId: number | null }>;
  recommendations: Array<{ action: string; why: string; channels: string[]; goalId: number | null; campaignId: number | null; productIds: number[]; offerId: number | null }>;
  measurementPlan: Array<{ metric: string; reason: string }>;
  guardrails: string[];
};

export default function AIStrategistClient() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planning, setPlanning] = useState(false);

  async function generate() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/marketing/strategist", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate strategy");
      setStrategy(data.strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate strategy");
    } finally {
      setLoading(false);
    }
  }

  function buildWeek() {
    if (!strategy) return;
    setPlanning(true);
    sessionStorage.setItem("dizito-strategy-handoff", JSON.stringify(strategy));
    window.location.href = "/generate-my-week?from=strategist";
  }

  return <main className="dizito-page space-y-5">
    <header className="dizito-card dizito-card-ai">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Sparkles size={22} /></div><div><p className="text-xs font-bold uppercase tracking-widest text-gray-500">AI Marketing Operator</p><h1 className="mt-1 text-2xl font-bold text-gray-900">AI Strategist</h1><p className="mt-1 max-w-3xl text-sm text-gray-500">Turn your Business Brain and measured marketing outcomes into an evidence-aware strategy. Recommendations are advisory only.</p></div></div>
      <button onClick={generate} disabled={loading || planning} className="dizito-button dizito-button-ai mt-5">{loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{loading ? "Analyzing…" : "Generate Strategy"}</button>
      {strategy && <button onClick={buildWeek} disabled={planning} className="dizito-button dizito-button-secondary ml-3 mt-5">{planning ? "Opening weekly planner…" : "Build This Week"}</button>}
    </header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {strategy && <>
      <section className="dizito-card"><h2 className="text-lg font-semibold text-gray-900">Strategy</h2><p className="mt-3 text-sm leading-6 text-gray-700">{strategy.strategySummary}</p></section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-gray-900">Priorities</h2><div className="mt-4 space-y-3">{strategy.priorities.map((item, index) => <article key={index} className="rounded-xl border p-4"><div className="font-semibold text-gray-900">{item.priority}</div><p className="mt-1 text-sm text-gray-600">{item.rationale}</p><p className="mt-2 text-xs text-gray-500">{item.goalId ? <span>Goal #{item.goalId}</span> : "No specific goal"}{item.campaignId ? <> · <a href={`/campaigns?focus=${item.campaignId}`} className="font-semibold underline">Campaign #{item.campaignId}</a></> : ""}</p></article>)}</div></section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-gray-900">Recommended actions</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{strategy.recommendations.map((item, index) => <article key={index} className="rounded-xl border p-4"><div className="font-semibold text-gray-900">{item.action}</div><p className="mt-1 text-sm text-gray-600">{item.why}</p>{item.channels.length > 0 && <p className="mt-2 text-xs text-gray-500">Channels: {item.channels.join(", ")}</p>}<p className="mt-1 text-xs text-gray-500">{item.productIds.length ? "Products: " + item.productIds.join(", ") : "No specific products"}{item.offerId ? " · Offer #" + item.offerId : ""}{item.campaignId ? <> · <a href={`/campaigns?focus=${item.campaignId}`} className="font-semibold underline">Campaign #{item.campaignId}</a></> : ""}</p></article>)}</div></section>
      <section className="grid gap-6 md:grid-cols-2"><div className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-gray-900">Measurement plan</h2><div className="mt-4 space-y-3">{strategy.measurementPlan.map((item, index) => <div key={index} className="rounded-xl bg-gray-50 p-3"><div className="text-sm font-semibold">{item.metric}</div><div className="mt-1 text-xs text-gray-600">{item.reason}</div></div>)}</div></div><div className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-gray-900">Guardrails</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-600">{strategy.guardrails.map((item, index) => <li key={index}>{item}</li>)}</ul></div></section>
    </>}
  </main>;
}
