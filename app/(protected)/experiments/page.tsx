"use client";

import { useEffect, useState } from "react";

type Experiment = {
  id: number;
  name: string;
  hypothesis: string;
  changeDescription: string;
  metric: string;
  status: string;
  campaignId: number | null;
  contentItemId: number | null;
  variantId: number | null;
  targetType: "campaign" | "content_item" | "variant" | null;
  targetField: string | null;
  targetMetadata: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  resultSummary: string | null;
  baselineStartsAt: string | null;
  baselineEndsAt: string | null;
};

type Outcome = { actionType: string; count: number; value: number };

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [outcomes, setOutcomes] = useState<Record<number, Outcome[]>>({});
  const [baselines, setBaselines] = useState<Record<number, Outcome[]>>({});
  const [campaignId, setCampaignId] = useState<number | null>(null);

  async function load(selectedCampaignId = campaignId) {
    try {
      const query = selectedCampaignId ? `?campaignId=${selectedCampaignId}` : "";
      const response = await fetch(`/api/marketing/experiments${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load experiments");
      setExperiments(data.experiments ?? []);
      const loaded = await Promise.all((data.experiments ?? []).map(async (item: Experiment) => { const response = await fetch(`/api/marketing/experiments/${item.id}`); const detail = await response.json(); return [item.id, detail.outcomes ?? [], detail.baselineOutcomes ?? []] as const; }));
      setOutcomes(Object.fromEntries(loaded.map(([id, current]) => [id, current])));
      setBaselines(Object.fromEntries(loaded.map(([id, , baseline]) => [id, baseline])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load experiments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("campaignId");
    const parsed = value ? Number(value) : null;
    if (parsed && Number.isInteger(parsed) && parsed > 0) setCampaignId(parsed);
    load(parsed && Number.isInteger(parsed) && parsed > 0 ? parsed : null);
  }, []);

  useEffect(() => {
    const focusId = new URLSearchParams(window.location.search).get("focus");
    if (!focusId) return;
    const target = document.getElementById(`experiment-${focusId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
    }
  }, [experiments]);

  async function update(id: number, status: string, resultSummary?: string) {
    setSaving(id);
    try {
      const response = await fetch(`/api/marketing/experiments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resultSummary }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update experiment");
      setExperiments((current) => current.map((item) => item.id === id ? data.experiment : item));
      setOutcomes((current) => ({ ...current, [id]: data.outcomes ?? [] }));
      setBaselines((current) => ({ ...current, [id]: data.baselineOutcomes ?? [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update experiment");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl p-6">Loading experiments...</main>;

  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <header><p className="text-xs font-bold uppercase tracking-widest text-gray-500">AI Marketing Operator</p><h1 className="mt-1 text-3xl font-bold">Experiments</h1><p className="mt-2 text-sm text-gray-500">Track approved marketing experiments from planned execution through observed results. Results are observational and do not imply causality.</p>{campaignId && <div className="mt-3 flex flex-wrap items-center gap-3"><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">Campaign #{campaignId} experiments</span><a href="/campaigns" className="text-sm font-semibold underline">Back to campaigns</a></div>}</header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {experiments.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-sm text-gray-500">No experiments have been planned yet.</div>}
    <div className="space-y-4">
      {experiments.map((item) => <article key={item.id} id={`experiment-${item.id}`} tabIndex={-1} className="rounded-2xl border bg-white p-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{item.name}</h2><p className="mt-1 text-sm text-gray-500">Status: {item.status}</p></div><div className="flex gap-2">
          {item.status === "planned" && <button disabled={saving === item.id} onClick={() => update(item.id, "running")} className="rounded-lg border px-3 py-2 text-sm font-semibold">Start</button>}
          {item.status === "running" && <button disabled={saving === item.id} onClick={() => update(item.id, "completed", window.prompt("Enter observed result summary") || "")} className="rounded-lg border px-3 py-2 text-sm font-semibold">Complete</button>}
          {item.status !== "completed" && item.status !== "cancelled" && <button disabled={saving === item.id} onClick={() => update(item.id, "cancelled")} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>}
        </div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3"><div><div className="text-xs uppercase text-gray-400">Hypothesis</div><p className="mt-1 text-sm">{item.hypothesis}</p></div><div><div className="text-xs uppercase text-gray-400">Change</div><p className="mt-1 text-sm">{item.changeDescription}</p></div><div><div className="text-xs uppercase text-gray-400">Metric</div><p className="mt-1 text-sm">{item.metric}</p></div></div>
        <div className="mt-4 text-xs text-gray-500">{item.campaignId ? `Campaign #${item.campaignId}` : "No campaign"}{item.contentItemId ? ` · Content #${item.contentItemId}` : ""}{item.variantId ? ` · Variant #${item.variantId}` : ""}{item.targetType ? ` · Target: ${item.targetType.replaceAll("_", " ")}` : ""}</div>
        {Array.isArray(item.targetMetadata?.supportingExperimentIds) && item.targetMetadata.supportingExperimentIds.length > 0 && <div className="mt-3 rounded-lg border border-dashed bg-gray-50 p-3 text-xs text-gray-600"><strong>Optimizer provenance:</strong> This experiment was approved from a weekly optimization recommendation supported by completed experiments {(item.targetMetadata.supportingExperimentIds as unknown[]).map(Number).filter(Number.isFinite).map((id) => `#${id}`).join(", ")}. This records provenance only; it does not imply causal uplift.</div>}
        {(outcomes[item.id] ?? []).length > 0 && <div className="mt-4 rounded-lg bg-gray-50 p-3"><div className="text-xs font-semibold uppercase text-gray-400">Observed customer outcomes</div><div className="mt-2 space-y-1 text-sm">{(outcomes[item.id] ?? []).map((outcome) => <div key={outcome.actionType}>{outcome.actionType.replaceAll("_", " ")} · {outcome.count} action{outcome.count === 1 ? "" : "s"} · value {outcome.value}</div>)}</div><div className="mt-2 text-xs text-gray-500">Observed tracking evidence; not causal attribution.</div></div>}
        {(baselines[item.id] ?? []).length > 0 && <div className="mt-4 rounded-lg border border-dashed bg-white p-3"><div className="text-xs font-semibold uppercase text-gray-400">Historical baseline</div><div className="mt-2 space-y-1 text-sm">{(baselines[item.id] ?? []).map((outcome) => <div key={outcome.actionType}>{outcome.actionType.replaceAll("_", " ")} · {outcome.count} action{outcome.count === 1 ? "" : "s"} · value {outcome.value}</div>)}</div>{(outcomes[item.id] ?? []).map((outcome) => { const baseline = (baselines[item.id] ?? []).find((item) => item.actionType === outcome.actionType); if (!baseline) return null; const countChange = outcome.count - baseline.count; const valueChange = outcome.value - baseline.value; const countPercent = baseline.count === 0 ? null : ((countChange / baseline.count) * 100).toFixed(1); const valuePercent = baseline.value === 0 ? null : ((valueChange / baseline.value) * 100).toFixed(1); return <div key={`comparison-${outcome.actionType}`} className="mt-3 border-t pt-3 text-sm"><strong>Descriptive change vs baseline:</strong> {countChange >= 0 ? "+" : ""}{countChange} actions{countPercent !== null ? ` (${countPercent}%)` : ""} · value {valueChange >= 0 ? "+" : ""}{valueChange}{valuePercent !== null ? ` (${valuePercent}%)` : ""}</div>; })}<div className="mt-2 text-xs text-gray-500">Equal-length historical window immediately before the experiment. Descriptive only; not a control group, causal estimate, or proof that the experiment caused the change.</div></div>}
        {item.resultSummary && <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm"><strong>Observed result:</strong> {item.resultSummary}</div>}
      </article>)}
    </div>
  </main>;
}
