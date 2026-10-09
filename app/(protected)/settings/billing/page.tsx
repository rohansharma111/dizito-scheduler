"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DizitoBadge,
  DizitoButton,
  DizitoCard,
  DizitoMetric,
  DizitoPage,
  DizitoPageHeader,
  DizitoSectionHeader,
  DizitoState,
} from "@/components/dizito/DizitoUI";

type BillingData = {
  plan: string;
  planDetails: {
    name: string;
    description: string | null;
    priceMinor: number;
    currency: string;
    interval: string;
    trialDays: number;
  };
  subscription: {
    provider: string | null;
    id: string | null;
    status: string | null;
    renewalDate: string | null;
    trialDaysLeft: number;
    cancelAtPeriodEnd: boolean;
    gracePeriodUntil: string | null;
  };
  usage: {
    socialChannels: number;
    socialChannelsLimit: number;
    commerceChannels: number;
    commerceChannelsLimit: number;
    publishing: number;
    publishingLimit: number;
    aiActions: number;
    aiActionsLimit: number;
  };
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

  useEffect(() => {
    loadBilling().catch((e) => setError(e instanceof Error ? e.message : "Failed to load billing"));
  }, []);

  async function changePlan(plan: "growth" | "pro" | "free") {
    setBusy(plan);
    setError(null);
    try {
      const response = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Plan change failed");
      await loadBilling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan change failed");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    setError(null);
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immediate: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Cancellation failed");
      await loadBilling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellation failed");
    } finally {
      setBusy(null);
    }
  }

  if (!billing) {
    return (
      <DizitoPage>
        <DizitoPageHeader eyebrow="Account" title="Billing" description="Manage your plan, usage and subscription." />
        {error ? (
          <DizitoState kind="error" title="Billing is unavailable" description={error} action={<DizitoButton variant="secondary" onClick={() => { setError(null); loadBilling().catch((e) => setError(e instanceof Error ? e.message : "Failed to load billing")); }}>Try again</DizitoButton>} />
        ) : (
          <DizitoState kind="empty" title="Loading billing" description="Retrieving your subscription and usage details." />
        )}
      </DizitoPage>
    );
  }

  const cards = [
    { label: "Social channels", used: billing.usage.socialChannels, limit: billing.usage.socialChannelsLimit },
    { label: "Commerce channels", used: billing.usage.commerceChannels, limit: billing.usage.commerceChannelsLimit },
    { label: "Publishing / month", used: billing.usage.publishing, limit: billing.usage.publishingLimit },
    { label: "AI actions / month", used: billing.usage.aiActions, limit: billing.usage.aiActionsLimit },
  ];

  return (
    <DizitoPage>
      <DizitoPageHeader
        eyebrow="Account"
        title="Billing & plan"
        description="Understand your current subscription, monitor usage, and manage plan changes."
        action={<Link href="/pricing"><DizitoButton variant="secondary">View pricing</DizitoButton></Link>}
      />

      {error && <DizitoState kind="error" title="Billing action failed" description={error} />}

      <DizitoCard>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DizitoBadge tone="ai">Current plan</DizitoBadge>
              <DizitoBadge>{billing.subscription.status ?? "free"}</DizitoBadge>
              {billing.pricingHypothesis && <DizitoBadge tone="warning">V1 pricing hypothesis</DizitoBadge>}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{billing.planDetails.name}</h2>
            {billing.planDetails.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{billing.planDetails.description}</p>}
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-3xl font-black tracking-tight text-slate-950">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: billing.planDetails.currency || "INR", maximumFractionDigits: 0 }).format(billing.planDetails.priceMinor / 100)}
            </p>
            <p className="mt-1 text-sm text-slate-500">per {billing.planDetails.interval || "month"}</p>
            {billing.subscription.renewalDate && <p className="mt-2 text-xs text-slate-500">Renewal: {new Date(billing.subscription.renewalDate).toLocaleDateString()}</p>}
          </div>
        </div>

        {billing.subscription.trialDaysLeft > 0 && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Trial ends in {billing.subscription.trialDaysLeft} day(s).</div>}
        {billing.subscription.gracePeriodUntil && <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">Payment issue detected. Access is retained through {new Date(billing.subscription.gracePeriodUntil).toLocaleDateString()}.</div>}
        {billing.subscription.cancelAtPeriodEnd && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Cancellation is scheduled at the end of the current billing period.</div>}
      </DizitoCard>

      <section className="mt-5">
        <DizitoSectionHeader title="Usage this period" description="Usage is shown against the limits returned by your current plan." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, used, limit }) => (
            <DizitoCard key={label}>
              <DizitoMetric label={label} value={`${used} / ${limit}`} />
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.max(1, Number(limit))} aria-valuenow={Math.min(Number(used), Number(limit))}>
                <div className="h-full rounded-full bg-lime-500" style={{ width: `${Math.min(100, limit ? (Number(used) / Number(limit)) * 100 : 0)}%` }} />
              </div>
            </DizitoCard>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <DizitoSectionHeader title="Plan capabilities" description="Availability of features for the active subscription." />
        <DizitoCard>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(billing.features).map(([key, enabled]) => (
              <div key={key} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <span className="break-words text-sm capitalize text-slate-700">{key.replaceAll("_", " ")}</span>
                <DizitoBadge tone={enabled ? "success" : "neutral"}>{enabled ? "Included" : "Not included"}</DizitoBadge>
              </div>
            ))}
          </div>
        </DizitoCard>
      </section>

      <section className="mt-7">
        <DizitoSectionHeader title="Manage subscription" description="Plan changes are applied through the existing billing API." />
        <DizitoCard>
          <div className="flex flex-wrap gap-3">
            {billing.subscription.id && billing.plan !== "growth" && billing.plan !== "pro" && <DizitoButton disabled={!!busy} onClick={() => changePlan("growth")}>{busy === "growth" ? "Updating…" : "Move to Growth"}</DizitoButton>}
            {billing.subscription.id ? (billing.plan !== "pro" && <DizitoButton variant="secondary" disabled={!!busy} onClick={() => changePlan("pro")}>{busy === "pro" ? "Updating…" : "Move to Pro"}</DizitoButton>) : <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">No provider-managed subscription is linked to this account.</p><p className="mt-1">Plan changes cannot be applied until a billing-provider subscription exists. If you intend to purchase a plan, review the available options on the pricing page.</p><Link href="/pricing" className="mt-3 inline-flex font-semibold underline underline-offset-4">View pricing</Link></div>}
            {billing.subscription.id && !billing.subscription.cancelAtPeriodEnd && <DizitoButton variant="secondary" disabled={!!busy} onClick={cancel}>{busy === "cancel" ? "Scheduling…" : "Cancel at period end"}</DizitoButton>}
          </div>
        </DizitoCard>
      </section>

      <section className="mt-7">
        <DizitoSectionHeader title="Billing history" description="Recorded billing events for this account." />
        <DizitoCard>
          {billing.billingHistory.length === 0 ? (
            <DizitoState kind="empty" title="No billing events yet" description="Billing events will appear here when available." />
          ) : (
            <div className="divide-y divide-slate-100">
              {billing.billingHistory.map((item, index) => (
                <div key={`${item.created_at}-${index}`} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="break-words font-medium text-slate-800">{item.event}</span>
                  <span className="text-slate-500">{item.amount == null ? "—" : `₹${item.amount}`} · {new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </DizitoCard>
      </section>

      {billing.pricingHypothesis && <p className="mt-5 text-xs leading-5 text-slate-500">Pricing, limits and trial durations shown here are V1 product hypotheses, not final commercial commitments.</p>}
    </DizitoPage>
  );
}
