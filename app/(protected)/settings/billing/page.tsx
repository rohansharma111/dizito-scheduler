"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BillingData = {
  plan: string;
  planDetails: { name: string; description: string | null; priceMinor: number; currency: string; interval: string; trialDays: number };
  subscription: { provider: string | null; id: string | null; status: string | null; renewalDate: string | null; trialDaysLeft: number; cancelAtPeriodEnd: boolean; gracePeriodUntil: string | null };
  usage: { socialChannels: number; socialChannelsLimit: number; commerceChannels: number; commerceChannelsLimit: number; publishing: number; publishingLimit: number; aiActions: number; aiActionsLimit: number };
  features: Record<string, boolean>;
  billingHistory: { event: string; amount: number | null; created_at: string }[];
  pricingHypothesis: boolean;
};

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBilling() {
    const response = await fetch("/api/billing");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to load billing");
    setBilling(data);
  }

  useEffect(() => { loadBilling().catch((e) => setError(e instanceof Error ? e.message : "Failed to load billing")); }, []);

  async function changePlan(plan: "growth" | "pro" | "free") {
    setBusy(plan); setError(null);
    try {
      const response = await fetch("/api/billing/change-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Plan change failed");
      await loadBilling();
    } catch (e) { setError(e instanceof Error ? e.message : "Plan change failed"); }
    finally { setBusy(null); }
  }

  async function cancel() {
    setBusy("cancel"); setError(null);
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ immediate: false }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Cancellation failed");
      await loadBilling();
    } catch (e) { setError(e instanceof Error ? e.message : "Cancellation failed"); }
    finally { setBusy(null); }
  }

  if (!billing) return <div className="p-8">{error ? `Billing unavailable: ${error}` : "Loading billing..."}</div>;

  const cards = [
    ["Social channels", billing.usage.socialChannels, billing.usage.socialChannelsLimit],
    ["Commerce channels", billing.usage.commerceChannels, billing.usage.commerceChannelsLimit],
    ["Publishing / month", billing.usage.publishing, billing.usage.publishingLimit],
    ["AI actions / month", billing.usage.aiActions, billing.usage.aiActionsLimit],
  ];

  return (
    <div className="space-y-8 p-8">
      <div className="rounded-2xl border bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div><p className="text-sm font-medium uppercase tracking-wide text-gray-500">Current plan</p><h1 className="mt-1 text-4xl font-bold">{billing.planDetails.name}</h1><p className="mt-2 max-w-2xl text-gray-600">{billing.planDetails.description}</p></div>
          <div className="text-right"><div className="text-3xl font-bold">₹{Math.round(billing.planDetails.priceMinor / 100)}<span className="text-base font-normal text-gray-500">/month</span></div><div className="mt-2 text-sm text-gray-500">{billing.subscription.status ?? "free"}</div></div>
        </div>
        {billing.subscription.trialDaysLeft > 0 && <div className="mt-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-900">Trial ends in {billing.subscription.trialDaysLeft} day(s).</div>}
        {billing.subscription.gracePeriodUntil && <div className="mt-6 rounded-lg bg-orange-50 p-4 text-sm text-orange-900">Payment issue detected. Access is retained through {new Date(billing.subscription.gracePeriodUntil).toLocaleDateString()}.</div>}
        {billing.subscription.cancelAtPeriodEnd && <div className="mt-6 rounded-lg bg-gray-100 p-4 text-sm text-gray-700">Cancellation is scheduled at the end of the current billing period.</div>}
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, used, limit]) => <div key={label} className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold">{used} / {limit}</p><div className="mt-3 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, limit ? (Number(used) / Number(limit)) * 100 : 0)}%` }} /></div></div>)}
      </div>
      <div className="rounded-2xl border bg-white p-7"><h2 className="text-xl font-semibold">Dizito capabilities</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{Object.entries(billing.features).map(([key, enabled]) => <div key={key} className="rounded-lg bg-gray-50 px-4 py-3">{enabled ? "✓" : "—"} {key.replaceAll("_", " ")}</div>)}</div></div>
      <div className="rounded-2xl border bg-white p-7"><div className="flex flex-wrap gap-3">
        {billing.plan !== "growth" && billing.plan !== "pro" && <button disabled={!!busy} onClick={() => changePlan("growth")} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50">{busy === "growth" ? "Updating…" : "Move to Growth"}</button>}
        {billing.plan !== "pro" && <button disabled={!!busy} onClick={() => changePlan("pro")} className="rounded-lg bg-gray-900 px-5 py-3 font-medium text-white disabled:opacity-50">{busy === "pro" ? "Updating…" : "Move to Pro"}</button>}
        {billing.subscription.id && !billing.subscription.cancelAtPeriodEnd && <button disabled={!!busy} onClick={cancel} className="rounded-lg border border-red-200 px-5 py-3 font-medium text-red-700 disabled:opacity-50">{busy === "cancel" ? "Scheduling…" : "Cancel at period end"}</button>}
        <Link href="/pricing" className="rounded-lg border px-5 py-3 font-medium">View pricing</Link>
      </div></div>
      <div className="rounded-2xl border bg-white p-7"><h2 className="text-xl font-semibold">Billing history</h2><div className="mt-5 space-y-3">{billing.billingHistory.length === 0 ? <p className="text-gray-500">No billing events yet.</p> : billing.billingHistory.map((item, index) => <div key={index} className="flex justify-between border-b pb-3 text-sm"><span>{item.event}</span><span>{item.amount == null ? "—" : `₹${item.amount}`} · {new Date(item.created_at).toLocaleDateString()}</span></div>)}</div></div>
      {billing.pricingHypothesis && <p className="text-xs text-gray-500">Pricing, limits and trial durations shown here are V1 product hypotheses, not final commercial commitments.</p>}
    </div>
  );
}
