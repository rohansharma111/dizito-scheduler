"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, Image, Link2, Package, Target, Tag } from "lucide-react";
import BusinessBrainActions from "@/components/marketing/BusinessBrainActions";
import { DizitoBadge, DizitoCard, DizitoMetric, DizitoPage, DizitoPageHeader, DizitoState, DizitoButton } from "@/components/dizito/DizitoUI";

type BusinessProfile = {
  businessName?: string | null;
  businessType?: string | null;
  industry?: string | null;
  location?: string | null;
  timezone?: string | null;
  websiteUrl?: string | null;
  brandVoice?: string | null;
  description?: string | null;
};
type Goal = { id: number; name: string; description?: string | null; goalType?: string | null; status: string };
type Offer = { id: number; name: string; description?: string | null; offerType?: string | null; status: string };
type BrainData = {
  profile: BusinessProfile | null;
  goals: Goal[];
  offers: Offer[];
  products: unknown[];
  inventory: unknown[];
  media: unknown[];
  socialAccounts: unknown[];
  recentPosts: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBusinessBrain(value: unknown): BrainData {
  if (!isRecord(value) || !isRecord(value.businessBrain)) {
    throw new Error("Business Brain returned an unexpected response.");
  }
  const brain = value.businessBrain;
  for (const field of ["goals", "offers", "products", "inventory", "media", "socialAccounts", "recentPosts"]) {
    if (!Array.isArray(brain[field])) throw new Error("Business Brain returned an unexpected response.");
  }
  if (brain.profile !== null && !isRecord(brain.profile)) {
    throw new Error("Business Brain returned an unexpected response.");
  }
  const validNamedItems = (items: unknown[], requireStatus: boolean) =>
    items.every((item) => isRecord(item) && typeof item.id === "number" && typeof item.name === "string" &&
      (!requireStatus || typeof item.status === "string"));
  if (!validNamedItems(brain.goals as unknown[], true) || !validNamedItems(brain.offers as unknown[], true)) {
    throw new Error("Business Brain returned an unexpected response.");
  }
  return brain as unknown as BrainData;
}

export default function BusinessBrainPage() {
  const [brain, setBrain] = useState<BrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBrain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/marketing/business-brain", { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : "Unable to load Business Brain.";
        throw new Error(message);
      }
      setBrain(parseBusinessBrain(payload));
    } catch (cause) {
      setBrain(null);
      setError(cause instanceof Error ? cause.message : "Unable to load Business Brain.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrain();
  }, [loadBrain]);

  if (loading) return <DizitoPage><DizitoPageHeader eyebrow="AI context" title="Business Brain" description="Loading the context Dizito uses to reason about your business." /><DizitoCard><div className="h-56 animate-pulse rounded-2xl bg-slate-100" /></DizitoCard></DizitoPage>;
  if (error || !brain) return <DizitoPage><DizitoState kind="error" title="Business Brain unavailable" description={error || "Unable to load your business context."} action={<DizitoButton variant="secondary" onClick={() => void loadBrain()}>Retry</DizitoButton>} /></DizitoPage>;

  const p = brain.profile;
  return (
    <DizitoPage>
      <DizitoPageHeader eyebrow="AI context" title={p?.businessName || "Business Brain"} description="One shared business context for strategy, weekly planning, content creation and optimization." action={<Link href="/ai-strategist"><DizitoButton><Brain size={16} />Ask Strategist</DizitoButton></Link>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DizitoMetric label="Goals" value={brain.goals.length} hint="Priorities Dizito can plan against" icon={<Target size={17} />} />
        <DizitoMetric label="Offers" value={brain.offers.length} hint="Active and historical offers" icon={<Tag size={17} />} />
        <DizitoMetric label="Products" value={brain.products.length} hint="Merchant-owned catalog context" icon={<Package size={17} />} />
        <DizitoMetric label="Channels" value={brain.socialAccounts.length} hint="Distribution context" icon={<Link2 size={17} />} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <DizitoCard>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">Business identity</h2><p className="mt-1 text-sm text-slate-500">The context AI should understand before making recommendations.</p></div><DizitoBadge tone="ai">AI context</DizitoBadge></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">{[
            ["Business type", p?.businessType], ["Industry", p?.industry], ["Location", p?.location], ["Timezone", p?.timezone], ["Website", p?.websiteUrl], ["Brand voice", p?.brandVoice],
          ].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "Not set"}</div></div>)}</div>
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-violet-700">Description</div><p className="mt-2 text-sm leading-6 text-slate-700">{p?.description || "Add a concise description of the business so strategy can be more grounded."}</p></div>
        </DizitoCard>
        <DizitoCard tone="soft">
          <h2 className="text-lg font-black">Context coverage</h2><p className="mt-1 text-sm text-slate-500">Build a richer brain by completing the merchant inputs below.</p>
          <div className="mt-5 space-y-2">{[
            ["/onboarding", "Business setup", "Complete the initial merchant setup."], ["/products", "Products", "Give AI concrete products to feature."], ["/media", "Media", "Supply reusable visual assets."], ["/accounts", "Channels", "Connect destinations for distribution."],
          ].map(([href, label, desc]) => <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 hover:border-violet-200"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{label === "Products" ? <Package size={15} /> : label === "Media" ? <Image size={15} /> : label === "Channels" ? <Link2 size={15} /> : <Brain size={15} />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-slate-500">{desc}</span></span><ArrowRight size={15} className="text-slate-300 group-hover:text-violet-500" /></Link>)}</div>
        </DizitoCard>
      </div>
      <div className="mt-5"><BusinessBrainActions onSaved={() => void loadBrain()} /></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DizitoCard><h2 className="text-lg font-black">Goals</h2><p className="mt-1 text-sm text-slate-500">What the business is trying to accomplish.</p><div className="mt-4 space-y-2">{brain.goals.length ? brain.goals.map((goal) => <div key={goal.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><div className="text-sm font-semibold">{goal.name}</div><div className="text-xs text-slate-500">{goal.description || goal.goalType}</div></div><DizitoBadge tone={goal.status === "active" ? "success" : "neutral"}>{goal.status}</DizitoBadge></div>) : <DizitoState kind="empty" title="No goals captured" description="Goals help the Strategist prioritize what matters." />}</div></DizitoCard>
        <DizitoCard><h2 className="text-lg font-black">Offers</h2><p className="mt-1 text-sm text-slate-500">Promotions and commercial context available to content.</p><div className="mt-4 space-y-2">{brain.offers.length ? brain.offers.slice(0, 6).map((offer) => <div key={offer.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><div className="text-sm font-semibold">{offer.name}</div><div className="text-xs text-slate-500">{offer.description || offer.offerType}</div></div><DizitoBadge tone={offer.status === "active" ? "success" : "neutral"}>{offer.status}</DizitoBadge></div>) : <DizitoState kind="empty" title="No offers captured" description="Add an offer when a promotion should influence the weekly plan." />}</div></DizitoCard>
      </div>
    </DizitoPage>
  );
}
