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
  startsAt: string | null;
  endsAt: string | null;
  resultSummary: string | null;
};

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<number | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/marketing/experiments");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load experiments");
      setExperiments(data.experiments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load experiments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update experiment");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl p-6">Loading experiments...</main>;

  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <header><p className="text-xs font-bold uppercase tracking-widest text-gray-500">AI Marketing Operator</p><h1 className="mt-1 text-3xl font-bold">Experiments</h1><p className="mt-2 text-sm text-gray-500">Track approved marketing experiments from planned execution through observed results. Results are observational and do not imply causality.</p></header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {experiments.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-sm text-gray-500">No experiments have been planned yet.</div>}
    <div className="space-y-4">
      {experiments.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{item.name}</h2><p className="mt-1 text-sm text-gray-500">Status: {item.status}</p></div><div className="flex gap-2">
          {item.status === "planned" && <button disabled={saving === item.id} onClick={() => update(item.id, "running")} className="rounded-lg border px-3 py-2 text-sm font-semibold">Start</button>}
          {item.status === "running" && <button disabled={saving === item.id} onClick={() => update(item.id, "completed", window.prompt("Enter observed result summary") || "")} className="rounded-lg border px-3 py-2 text-sm font-semibold">Complete</button>}
          {item.status !== "completed" && item.status !== "cancelled" && <button disabled={saving === item.id} onClick={() => update(item.id, "cancelled")} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>}
        </div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3"><div><div className="text-xs uppercase text-gray-400">Hypothesis</div><p className="mt-1 text-sm">{item.hypothesis}</p></div><div><div className="text-xs uppercase text-gray-400">Change</div><p className="mt-1 text-sm">{item.changeDescription}</p></div><div><div className="text-xs uppercase text-gray-400">Metric</div><p className="mt-1 text-sm">{item.metric}</p></div></div>
        <div className="mt-4 text-xs text-gray-500">{item.campaignId ? `Campaign #${item.campaignId}` : "No campaign"}{item.contentItemId ? ` · Content #${item.contentItemId}` : ""}{item.variantId ? ` · Variant #${item.variantId}` : ""}</div>
        {item.resultSummary && <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm"><strong>Observed result:</strong> {item.resultSummary}</div>}
      </article>)}
    </div>
  </main>;
}
