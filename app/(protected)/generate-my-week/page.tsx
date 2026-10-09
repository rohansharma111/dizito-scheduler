"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, FlaskConical, Sparkles, WandSparkles } from "lucide-react";
import { DizitoBadge, DizitoButton, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

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
  const [strategyHandoff, setStrategyHandoff] = useState<any>(null);
  const [optimizerHandoff, setOptimizerHandoff] = useState<any>(null);

  useEffect(() => {
    const strategyRaw = sessionStorage.getItem("dizito-strategy-handoff");
    const optimizerRaw = sessionStorage.getItem("dizito-optimizer-handoff");
    try {
      if (strategyRaw) setStrategyHandoff(JSON.parse(strategyRaw));
      if (optimizerRaw) setOptimizerHandoff(JSON.parse(optimizerRaw));
    } catch {
      sessionStorage.removeItem("dizito-strategy-handoff");
      sessionStorage.removeItem("dizito-optimizer-handoff");
    }
  }, []);

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
        body: JSON.stringify({
          weekStart,
          strategy: strategyHandoff
            ? { ...strategyHandoff, optimization: optimizerHandoff ?? undefined }
            : optimizerHandoff
              ? { optimization: optimizerHandoff }
              : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate week");
      setPlan(data.generatedWeek);
      if (strategyHandoff) sessionStorage.removeItem("dizito-strategy-handoff");
      if (optimizerHandoff) sessionStorage.removeItem("dizito-optimizer-handoff");
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
      experiment: plan.experiment
        ? {
            hypothesis: plan.experiment.hypothesis,
            change: plan.experiment.change,
            metric: plan.experiment.metric,
            disposition: plan.experiment.disposition,
            selectionReason: plan.experiment.selectionReason,
          }
        : null,
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
            sourceCampaignId: item.sourceCampaignId ?? null,
            evidence: item.evidence ?? null,
            supportingExperimentIds: Array.isArray(item.supportingExperimentIds)
              ? item.supportingExperimentIds.map(Number).filter((id: number) => Number.isFinite(id))
              : [],
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
    <DizitoPage>
      <DizitoPageHeader
        eyebrow="AI marketing operator"
        title="Generate My Week"
        description="Build a reviewable weekly plan from your saved goals, products, offers, connected channels and measured activity — no AI credits required."
        action={
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm">
            <CalendarDays size={16} className="text-violet-600" />
            <span className="sr-only">Week starts</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="bg-transparent outline-none"
            />
          </label>
        }
      />

      <DizitoCard tone="soft" className="mb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Template-assisted planning is available now</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Dizito can organize your existing business data into a weekly plan without calling a paid AI provider. Review every recommendation, edit the copy manually in Marketing Content, and approve only what fits your business. AI-assisted strategy and writing are coming soon.</p></div><DizitoBadge tone="neutral">AI · Coming soon</DizitoBadge></div></DizitoCard>

      {(strategyHandoff || optimizerHandoff) && (
        <DizitoCard tone="ai" className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <DizitoBadge tone="ai"><Sparkles size={13} /> AI handoff</DizitoBadge>
            {strategyHandoff && <span className="text-sm font-semibold text-slate-700">Latest Strategist recommendation will guide this week.</span>}
            {optimizerHandoff && <span className="text-sm font-semibold text-slate-700">Optimizer evidence will be applied where available.</span>}
          </div>
        </DizitoCard>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <DizitoButton onClick={generate} disabled={loading || saving}>
          <WandSparkles size={16} /> {loading ? "Generating…" : "Generate My Week"}
        </DizitoButton>
        {plan && !approved && (
          <DizitoButton variant="secondary" onClick={approve} disabled={saving || recommendations.length === 0}>
            <CheckCircle2 size={16} /> {saving ? "Approving…" : "Approve Week"}
          </DizitoButton>
        )}
        {approved && <DizitoBadge tone="success"><CheckCircle2 size={14} /> Approved for review</DizitoBadge>}
      </div>

      {message && (
        <DizitoCard className="mb-5" tone="soft">
          <p className="text-sm font-semibold text-slate-700">{message}</p>
        </DizitoCard>
      )}

      {!plan && !loading && (
        <DizitoState
          kind="empty"
          title="Your week is not planned yet"
          description="Generate a recommendation first. Approval creates a planned campaign and Content Items; it does not schedule or publish posts."
          action={<DizitoButton onClick={generate} disabled={saving}><WandSparkles size={15} /> Generate plan</DizitoButton>}
        />
      )}

      {loading && (
        <DizitoCard>
          <div className="space-y-3 animate-pulse">
            <div className="h-6 w-2/3 rounded-lg bg-slate-100" />
            <div className="h-4 w-full rounded-lg bg-slate-100" />
            <div className="h-4 w-5/6 rounded-lg bg-slate-100" />
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-2xl bg-slate-100" />)}
            </div>
          </div>
        </DizitoCard>
      )}

      {plan && (
        <div className="space-y-5">
          <DizitoCard tone="ai">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <DizitoBadge tone="ai"><Sparkles size={13} /> Weekly strategy</DizitoBadge>
                <h2 className="mt-3 text-xl font-black text-slate-900">{plan.strategySummary}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Review the recommendations below before approval. Publishing remains a separate step.</p>
              </div>
              <DizitoBadge tone={approved ? "success" : "neutral"}>{approved ? "Approved" : "Needs review"}</DizitoBadge>
            </div>

            {recommendations[0] && (
              <div className="mt-5 rounded-2xl border border-violet-100 bg-white/80 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700">
                  <Sparkles size={13} /> Highest-evidence optimization focus
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{recommendations[0].rationale}</p>
                {recommendations[0].evidence && (
                  <p className="mt-3 text-xs text-slate-500">
                    Observed evidence: {recommendations[0].evidence.sourceType === "variant" ? `Variant #${recommendations[0].evidence.sourceId}` : `Content Item #${recommendations[0].evidence.sourceId}`} · {recommendations[0].evidence.count} {String(recommendations[0].evidence.actionType).replaceAll("_", " ")} action{recommendations[0].evidence.count === 1 ? "" : "s"} · value {recommendations[0].evidence.value}{recommendations[0].evidence.platform ? ` · ${recommendations[0].evidence.platform}` : ""}. This is observational evidence, not causal proof.
                  </p>
                )}
              </div>
            )}

            {plan.experiment && (
              <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700"><FlaskConical size={14} /> Experiment to review</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Info label="Hypothesis" value={plan.experiment.hypothesis} />
                  <Info label="Change" value={plan.experiment.change} />
                  <Info label="Measure" value={plan.experiment.metric} />
                  <Info label="Disposition" value={plan.experiment.disposition} />
                </div>
                {plan.experiment.selectionReason && <p className="mt-3 text-sm text-slate-600"><strong>Why selected:</strong> {plan.experiment.selectionReason}</p>}
              </div>
            )}
          </DizitoCard>

          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((item: any, index: number) => (
              <DizitoCard key={`${item.day}-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <DizitoBadge tone="neutral">{dayNames[index] ?? item.day}</DizitoBadge>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.contentType}</span>
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">{item.topic}</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p><strong className="text-slate-800">Hook:</strong> {item.hook}</p>
                  <p><strong className="text-slate-800">CTA:</strong> {item.cta}</p>
                  <p className="leading-6">{item.rationale}</p>
                </div>
                {item.sourceCampaignId && (
                  <Link href={`/campaigns?focus=${item.sourceCampaignId}`} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline">
                    Source campaign #{item.sourceCampaignId} <ArrowRight size={13} />
                  </Link>
                )}
                {Array.isArray(item.supportingExperimentIds) && item.supportingExperimentIds.length > 0 && (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <strong>Experiment evidence:</strong> {item.supportingExperimentIds.map((id: number) => `Experiment #${id}`).join(", ")}.
                    <div className="mt-1 text-slate-400">Linked from completed experiment history.</div>
                  </div>
                )}
                {item.evidence && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    <strong>Observed outcome:</strong> {item.evidence.count} {String(item.evidence.actionType).replaceAll("_", " ")} action{item.evidence.count === 1 ? "" : "s"} · value {item.evidence.value}{item.evidence.platform ? ` · ${item.evidence.platform}` : ""}.
                  </div>
                )}
                {item.suggestedChannels?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.suggestedChannels.map((channel: string) => <DizitoBadge key={channel} tone="neutral">{channel}</DizitoBadge>)}
                  </div>
                )}
              </DizitoCard>
            ))}
          </div>
        </div>
      )}
    </DizitoPage>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-xl bg-white/70 p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold text-slate-700">{value || "Not specified"}</div></div>;
}
