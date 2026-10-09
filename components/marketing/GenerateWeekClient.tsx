"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, ChevronDown, ChevronUp, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";

type ContentItem = {
  contentType: string;
  format: string;
  topic: string;
  angle: string;
  hook: string;
  body: string;
  cta: string;
  plannedFor: string | null;
};

type Campaign = {
  name: string;
  objective: string;
  audience: string;
  offerId: number | null;
  productIds: number[];
  cta: string;
  channelStrategy: Record<string, unknown>;
  contentItems: ContentItem[];
};

type Strategy = { strategySummary: string; campaigns: Campaign[] };
type Brain = { profile?: { businessName?: string | null; industry?: string | null }; products?: Array<{ id: number; name: string }>; offers?: Array<{ id: number; name: string }> };

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const iso = (value: Date) => value.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

function prettyDate(value: string | null) {
  if (!value) return "Any day";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function GenerateWeekClient() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [brain, setBrain] = useState<Brain>({});
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loadingBrain, setLoadingBrain] = useState(true);
  const [approving, setApproving] = useState(false);
  const [creatorIndex, setCreatorIndex] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCampaign, setOpenCampaign] = useState<number | null>(0);
  const week = useMemo(() => getWeekRange(), []);

  useEffect(() => {
    fetch("/api/marketing/ai-status").then((response) => response.json()).then((data) => setAiEnabled(data.enabled === true)).catch(() => setAiEnabled(false));
    fetch("/api/marketing/business-brain")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load business context");
        return response.json();
      })
      .then((data) => setBrain(data.businessBrain || {}))
      .catch(() => undefined)
      .finally(() => setLoadingBrain(false));
  }, []);

  function buildTemplateWeek() {
    setError(null);
    setApproved(false);
    const product = brain.products?.[0];
    const offer = brain.offers?.find((item) => item.name);
    const businessName = brain.profile?.businessName || "your business";
    const slots = [
      { topic: product ? `Meet ${product.name}` : "Introduce your business", angle: "Awareness", hook: product ? `Get to know ${product.name}` : "Here is what makes our business different", body: product ? `Meet ${product.name}\n\n[Add one verified benefit, who it helps, and what makes it useful.]` : `We are ${businessName}.\n\n[Share what you do, who you help, and what customers can expect.]`, cta: "Learn more" },
      { topic: "Helpful tip or mini-guide", angle: "Education", hook: "A simple tip you can use today", body: "Try this: [Add one practical tip related to your product or industry.]\n\n[Explain why it helps in one or two sentences.]", cta: "Save this tip" },
      { topic: offer ? `Highlight ${offer.name}` : "Behind the scenes", angle: "Trust", hook: offer ? `A little more about ${offer.name}` : "A look behind the scenes", body: offer ? `Here is the detail on ${offer.name}: [Add the accurate terms and who it is for.]` : "Here is a look behind the scenes: [Share a real process, team moment, or useful detail customers may not know.]", cta: "Ask us a question" },
      { topic: "Frequently asked question", angle: "Consideration", hook: "A question we often hear", body: "Question: [Add a real customer question.]\n\nAnswer: [Write a clear, factual answer in your own words.]", cta: "Send us your question" },
      { topic: product ? `How to use ${product.name}` : "Customer problem and solution", angle: "Action", hook: "Need help with [customer need]?", body: product ? `Here is one way to use ${product.name}: [Add simple steps and a relevant use case.]` : "If you are trying to [customer need], we can help by [describe your real service or process].", cta: "Get in touch" },
    ];
    const start = new Date(`${week.start}T12:00:00`);
    const contentItems = slots.map((slot, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return { contentType: "social", format: "post", topic: slot.topic, angle: slot.angle, hook: slot.hook, body: slot.body, cta: slot.cta, plannedFor: date.toISOString().slice(0, 10) };
    });
    setStrategy({
      strategySummary: `A practical, editable five-post plan for ${businessName}. These are reusable starting templates, not AI-generated copy. Personalize every bracketed instruction and verify all claims before approval.`,
      campaigns: [{ name: `${businessName} weekly content plan`, objective: "Maintain a consistent, useful social presence", audience: "Your existing and prospective customers", offerId: offer?.id ?? null, productIds: product ? [product.id] : [], cta: "Learn more", channelStrategy: {}, contentItems }],
    });
    setOpenCampaign(0);
  }

  async function generate() {
    setLoading(true); setApproved(false); setError(null);
    try {
      const response = await fetch("/api/marketing/generate-week", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate this week");
      const result = data?.strategy;
      if (
        !result ||
        typeof result.strategySummary !== "string" ||
        !Array.isArray(result.campaigns) ||
        result.campaigns.some((campaign: unknown) => {
          if (!campaign || typeof campaign !== "object") return true;
          const item = campaign as Record<string, unknown>;
          return typeof item.name !== "string" || !Array.isArray(item.contentItems);
        })
      ) {
        throw new Error("The weekly plan response was incomplete. Please try again.");
      }
      setStrategy(result); setOpenCampaign(0);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to generate this week"); }
    finally { setLoading(false); }
  }

  async function generateCopy(campaignIndex: number, contentIndex: number) {\n    if (!aiEnabled) { setError("AI copy generation is coming soon. Edit the starter copy manually."); return; }
    if (!strategy) return;
    const item = strategy.campaigns[campaignIndex].contentItems[contentIndex];
    const campaign = strategy.campaigns[campaignIndex];
    const key = `${campaignIndex}:${contentIndex}`;
    setCreatorIndex(key); setError(null);
    try {
      const response = await fetch("/api/marketing/generate-content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, campaignName: campaign.name, campaignObjective: campaign.objective, audience: campaign.audience, productIds: campaign.productIds, offerId: campaign.offerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate copy");
      if (!data?.copy || typeof data.copy.body !== "string") {
        throw new Error("The generated copy response was incomplete. Please try again.");
      }
      updateContent(campaignIndex, contentIndex, { body: data.copy.body });
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to generate copy"); }
    finally { setCreatorIndex(null); }
  }

  async function approve() {
    if (!strategy) return;
    setApproving(true); setError(null);
    try {
      const response = await fetch("/api/marketing/weekly-plans/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart: week.start, weekEnd: week.end, strategy }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to approve week");
      setApproved(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to approve week"); }
    finally { setApproving(false); }
  }

  function updateCampaign(index: number, patch: Partial<Campaign>) {
    setStrategy((current) => {
      if (!current) return current;
      const campaigns = [...current.campaigns]; campaigns[index] = { ...campaigns[index], ...patch };
      return { ...current, campaigns };
    });
  }

  function updateContent(campaignIndex: number, contentIndex: number, patch: Partial<ContentItem>) {
    setStrategy((current) => {
      if (!current) return current;
      const campaigns = [...current.campaigns]; const contentItems = [...campaigns[campaignIndex].contentItems];
      contentItems[contentIndex] = { ...contentItems[contentIndex], ...patch }; campaigns[campaignIndex] = { ...campaigns[campaignIndex], contentItems };
      return { ...current, campaigns };
    });
  }

  function removeContent(campaignIndex: number, contentIndex: number) {
    setStrategy((current) => {
      if (!current) return current;
      const campaigns = [...current.campaigns]; campaigns[campaignIndex] = { ...campaigns[campaignIndex], contentItems: campaigns[campaignIndex].contentItems.filter((_, index) => index !== contentIndex) };
      return { ...current, campaigns };
    });
  }

  function addContent(campaignIndex: number) {
    const item: ContentItem = { contentType: "social", format: "post", topic: "", angle: "", hook: "", body: "", cta: "", plannedFor: null };
    setStrategy((current) => {
      if (!current) return current;
      const campaigns = [...current.campaigns]; campaigns[campaignIndex] = { ...campaigns[campaignIndex], contentItems: [...campaigns[campaignIndex].contentItems, item] };
      return { ...current, campaigns };
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="dizito-card dizito-card-ai">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600"><Sparkles size={16} /> Marketing Planner {!aiEnabled && <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">AI coming soon</span>}</div>
            <h1 className="text-3xl font-bold text-gray-900">Generate My Week</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Build a practical weekly marketing plan from your business context, products, offers and existing assets. Review everything before it is saved.</p>
            <div className="mt-3 text-sm text-gray-500">Week of <span className="font-medium text-gray-700">{week.start}</span> → <span className="font-medium text-gray-700">{week.end}</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={buildTemplateWeek} disabled={loading || approving} className="dizito-button dizito-button-primary"><CalendarClock size={18} />{strategy ? "Rebuild from templates" : "Build a week from templates"}</button>\n            <button onClick={generate} disabled={!aiEnabled || loading || approving} title={!aiEnabled ? "AI generation is coming soon" : "Generate an AI-assisted weekly plan"} className="dizito-button dizito-button-ai disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}{loading ? "Generating..." : "AI plan · Coming soon"}</button>
            {strategy && <button onClick={approve} disabled={approving || approved} className="dizito-button dizito-button-secondary">{approving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}{approved ? "Week Approved" : "Approve Week"}</button>}
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {approved && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Week approved. Campaigns and content plans are saved; nothing has been published.</div>}

      {!strategy && !loading && <div className="rounded-2xl border border-dashed bg-white p-12 text-center shadow-sm"><CalendarClock className="mx-auto mb-4 text-violet-600" size={32} /><h2 className="text-xl font-semibold text-gray-900">Start with a ready-to-edit weekly plan</h2><p className="mx-auto mt-2 max-w-xl text-gray-500">Build five practical post prompts from reusable templates, then customize the topic, hook, copy, call to action, product and offer before approving. No AI credits required.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={buildTemplateWeek} className="dizito-button dizito-button-primary"><CalendarClock size={16} /> Build a week from templates</button><button onClick={generate} disabled={!aiEnabled} className="dizito-button dizito-button-ai disabled:opacity-50"><Sparkles size={16} /> AI plan · Coming soon</button></div></div>}

      {strategy && <>
        <section className="rounded-2xl border bg-white p-6 shadow-sm"><label className="block text-sm font-semibold text-gray-700">Weekly strategy</label><textarea value={strategy.strategySummary} onChange={(event) => setStrategy({ ...strategy, strategySummary: event.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></section>
        <div className="space-y-4">
          {strategy.campaigns.map((campaign, campaignIndex) => {
            const isOpen = openCampaign === campaignIndex;
            return <section key={campaignIndex} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <button onClick={() => setOpenCampaign(isOpen ? null : campaignIndex)} className="flex w-full items-center justify-between p-5 text-left hover:bg-gray-50"><div><div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Campaign {campaignIndex + 1}</div><h2 className="mt-1 text-xl font-semibold text-gray-900">{campaign.name || "Untitled campaign"}</h2><p className="mt-1 text-sm text-gray-500">{campaign.objective || "Add an objective"} · {campaign.contentItems.length} content item{campaign.contentItems.length === 1 ? "" : "s"}</p></div>{isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
              {isOpen && <div className="space-y-6 border-t p-5">
                <div className="grid gap-4 md:grid-cols-2"><Field label="Campaign name" value={campaign.name} onChange={(value) => updateCampaign(campaignIndex, { name: value })} /><Field label="Objective" value={campaign.objective} onChange={(value) => updateCampaign(campaignIndex, { objective: value })} /><Field label="Audience" value={campaign.audience} onChange={(value) => updateCampaign(campaignIndex, { audience: value })} /><Field label="CTA" value={campaign.cta} onChange={(value) => updateCampaign(campaignIndex, { cta: value })} /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className="block text-sm font-medium text-gray-700">Offer</label><select value={campaign.offerId ?? ""} onChange={(event) => updateCampaign(campaignIndex, { offerId: event.target.value ? Number(event.target.value) : null })} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3" disabled={loadingBrain}><option value="">No offer</option>{(brain.offers || []).map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700">Products</label><div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-gray-300 p-3">{(brain.products || []).length === 0 && <span className="text-sm text-gray-400">No products available</span>}{(brain.products || []).map((product) => { const selected = campaign.productIds.includes(product.id); return <button key={product.id} type="button" onClick={() => updateCampaign(campaignIndex, { productIds: selected ? campaign.productIds.filter((id) => id !== product.id) : [...campaign.productIds, product.id] })} className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{product.name}</button>; })}</div></div>
                </div>
                <div><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-gray-900">Content plan</h3><p className="text-sm text-gray-500">Create the copy here, review it, then approve the plan.</p></div><button onClick={() => addContent(campaignIndex)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"><Plus size={15} /> Add</button></div>
                  <div className="space-y-3">{campaign.contentItems.map((item, contentIndex) => { const creatorKey = `${campaignIndex}:${contentIndex}`; return <div key={contentIndex} className="rounded-xl border bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Content {contentIndex + 1} · {prettyDate(item.plannedFor)}</span><button onClick={() => removeContent(campaignIndex, contentIndex)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600" aria-label="Remove content item"><Trash2 size={16} /></button></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Type" value={item.contentType} onChange={(value) => updateContent(campaignIndex, contentIndex, { contentType: value })} /><Field label="Format" value={item.format} onChange={(value) => updateContent(campaignIndex, contentIndex, { format: value })} /><Field label="Topic" value={item.topic} onChange={(value) => updateContent(campaignIndex, contentIndex, { topic: value })} /><Field label="Angle" value={item.angle} onChange={(value) => updateContent(campaignIndex, contentIndex, { angle: value })} /><Field label="Hook" value={item.hook} onChange={(value) => updateContent(campaignIndex, contentIndex, { hook: value })} /><Field label="CTA" value={item.cta} onChange={(value) => updateContent(campaignIndex, contentIndex, { cta: value })} /><Field label="Planned date" value={item.plannedFor || ""} type="date" onChange={(value) => updateContent(campaignIndex, contentIndex, { plannedFor: value || null })} /></div>
                    <div className="mt-3"><div className="mb-2 flex items-center justify-between"><label className="block text-sm font-medium text-gray-700">Post copy</label><button type="button" onClick={() => generateCopy(campaignIndex, contentIndex)} disabled={!aiEnabled || creatorIndex === creatorKey} title={!aiEnabled ? "AI copy generation is coming soon; edit the copy manually" : "Generate copy with AI"} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60">{creatorIndex === creatorKey ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}{!aiEnabled ? "AI rewrite · Coming soon" : creatorIndex === creatorKey ? "Creating..." : item.body ? "Rewrite with AI" : "Create with AI"}</button></div><textarea value={item.body} onChange={(event) => updateContent(campaignIndex, contentIndex, { body: event.target.value })} rows={6} placeholder="Write or generate the publish-ready copy..." className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><p className="mt-1 text-xs text-gray-500">{aiEnabled ? "AI uses the Business Brain and this campaign brief. Review claims before publishing." : "Template starter copy — replace every bracketed instruction with accurate business details. AI-assisted writing will be available later."}</p></div>
                  </div>; })}{campaign.contentItems.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No content items. Add one to keep the campaign actionable.</div>}</div>
                </div>
              </div>}
            </section>;
          })}
        </div>
      </>}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><label className="block text-sm font-medium text-gray-700">{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>;
}
