"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";

type ContentItem = {
  contentType: string;
  format: string;
  topic: string;
  angle: string;
  hook: string;
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

type Strategy = {
  strategySummary: string;
  campaigns: Campaign[];
};

type Brain = {
  products?: Array<{ id: number; name: string }>;
  offers?: Array<{ id: number; name: string }>;
};

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
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function GenerateWeekClient() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [brain, setBrain] = useState<Brain>({});
  const [loading, setLoading] = useState(false);
  const [loadingBrain, setLoadingBrain] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCampaign, setOpenCampaign] = useState<number | null>(0);
  const week = useMemo(() => getWeekRange(), []);

  useEffect(() => {
    fetch("/api/marketing/business-brain")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load business context");
        return response.json();
      })
      .then((data) => setBrain(data.businessBrain || {}))
      .catch(() => undefined)
      .finally(() => setLoadingBrain(false));
  }, []);

  async function generate() {
    setLoading(true);
    setApproved(false);
    setError(null);
    try {
      const response = await fetch("/api/marketing/generate-week", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate this week");
      setStrategy(data.strategy);
      setOpenCampaign(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate this week");
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    if (!strategy) return;
    setApproving(true);
    setError(null);
    try {
      const response = await fetch("/api/marketing/weekly-plans/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: week.start, weekEnd: week.end, strategy }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to approve week");
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve week");
    } finally {
      setApproving(false);
    }
  }

  function updateCampaign(index: number, patch: Partial<Campaign>) {
    setStrategy((current) => {
      if (!current) return current;
      const campaigns = [...current.campaigns];
      campaigns[index] = { ...campaigns[index], ...patch };
      return { ...current, campaigns };
    });
  }

  function updateContent(campaignIndex: number, contentIndex: number, patch: Partial<ContentItem>) {
    setStrategy((current) => {
      if (!current) return current;
      const campaigns = [...current.campaigns];
      const contentItems = [...campaigns[campaignIndex].contentItems];
      contentItems[contentIndex] = { ...contentItems[contentIndex], ...patch };
      campaigns[campaignIndex] = { ...campaigns[campaignIndex], contentItems };
      return { ...current, campaigns };
    });
  }

  function removeContent(campaignIndex: number, contentIndex: number) {
    setStrategy((current) => {
      if (!current) return current;
      const campaigns = [...current.campaigns];
      campaigns[campaignIndex] = {
        ...campaigns[campaignIndex],
        contentItems: campaigns[campaignIndex].contentItems.filter((_, index) => index !== contentIndex),
      };
      return { ...current, campaigns };
    });
  }

  function addContent(campaignIndex: number) {
    const item: ContentItem = {
      contentType: "social",
      format: "post",
      topic: "",
      angle: "",
      hook: "",
      cta: "",
      plannedFor: null,
    };
    setStrategy((current) => {
      if (!current) return current;
      const campaigns = [...current.campaigns];
      campaigns[campaignIndex] = {
        ...campaigns[campaignIndex],
        contentItems: [...campaigns[campaignIndex].contentItems, item],
      };
      return { ...current, campaigns };
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <Sparkles size={16} /> AI Marketing Planner
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Generate My Week</h1>
            <p className="mt-2 max-w-2xl text-gray-600">
              Build a practical weekly marketing plan from your business context, products, offers and existing assets. Review everything before it is saved.
            </p>
            <div className="mt-3 text-sm text-gray-500">
              Week of <span className="font-medium text-gray-700">{week.start}</span> → <span className="font-medium text-gray-700">{week.end}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generate}
              disabled={loading || approving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : strategy ? <RefreshCw size={18} /> : <Sparkles size={18} />}
              {loading ? "Generating..." : strategy ? "Regenerate" : "Generate My Week"}
            </button>
            {strategy && (
              <button
                onClick={approve}
                disabled={approving || approved}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {approving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                {approved ? "Week Approved" : "Approve Week"}
              </button>
            )}
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {approved && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Week approved. Campaigns and content plans are saved; nothing has been published.</div>}

      {!strategy && !loading && (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center shadow-sm">
          <Sparkles className="mx-auto mb-4 text-blue-600" size={32} />
          <h2 className="text-xl font-semibold text-gray-900">Your weekly marketing plan starts here</h2>
          <p className="mx-auto mt-2 max-w-xl text-gray-500">Dizito will use your Business Brain and existing marketing assets to propose campaigns and content. You stay in control.</p>
          <button onClick={generate} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Generate a plan</button>
        </div>
      )}

      {strategy && (
        <>
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700">Weekly strategy</label>
            <textarea
              value={strategy.strategySummary}
              onChange={(event) => setStrategy({ ...strategy, strategySummary: event.target.value })}
              rows={3}
              className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          <div className="space-y-4">
            {strategy.campaigns.map((campaign, campaignIndex) => {
              const isOpen = openCampaign === campaignIndex;
              return (
                <section key={campaignIndex} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <button onClick={() => setOpenCampaign(isOpen ? null : campaignIndex)} className="flex w-full items-center justify-between p-5 text-left hover:bg-gray-50">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Campaign {campaignIndex + 1}</div>
                      <h2 className="mt-1 text-xl font-semibold text-gray-900">{campaign.name || "Untitled campaign"}</h2>
                      <p className="mt-1 text-sm text-gray-500">{campaign.objective || "Add an objective"} · {campaign.contentItems.length} content item{campaign.contentItems.length === 1 ? "" : "s"}</p>
                    </div>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>

                  {isOpen && (
                    <div className="space-y-6 border-t p-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Campaign name" value={campaign.name} onChange={(value) => updateCampaign(campaignIndex, { name: value })} />
                        <Field label="Objective" value={campaign.objective} onChange={(value) => updateCampaign(campaignIndex, { objective: value })} />
                        <Field label="Audience" value={campaign.audience} onChange={(value) => updateCampaign(campaignIndex, { audience: value })} />
                        <Field label="CTA" value={campaign.cta} onChange={(value) => updateCampaign(campaignIndex, { cta: value })} />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Offer</label>
                          <select
                            value={campaign.offerId ?? ""}
                            onChange={(event) => updateCampaign(campaignIndex, { offerId: event.target.value ? Number(event.target.value) : null })}
                            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3"
                            disabled={loadingBrain}
                          >
                            <option value="">No offer</option>
                            {(brain.offers || []).map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Products</label>
                          <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-gray-300 p-3">
                            {(brain.products || []).length === 0 && <span className="text-sm text-gray-400">No products available</span>}
                            {(brain.products || []).map((product) => {
                              const selected = campaign.productIds.includes(product.id);
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => updateCampaign(campaignIndex, { productIds: selected ? campaign.productIds.filter((id) => id !== product.id) : [...campaign.productIds, product.id] })}
                                  className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                                >
                                  {product.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">Content plan</h3>
                            <p className="text-sm text-gray-500">These are planning items. Approval does not publish them.</p>
                          </div>
                          <button onClick={() => addContent(campaignIndex)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"><Plus size={15} /> Add</button>
                        </div>

                        <div className="space-y-3">
                          {campaign.contentItems.map((item, contentIndex) => (
                            <div key={contentIndex} className="rounded-xl border bg-gray-50 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Content {contentIndex + 1} · {prettyDate(item.plannedFor)}</span>
                                <button onClick={() => removeContent(campaignIndex, contentIndex)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600" aria-label="Remove content item"><Trash2 size={16} /></button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Type" value={item.contentType} onChange={(value) => updateContent(campaignIndex, contentIndex, { contentType: value })} />
                                <Field label="Format" value={item.format} onChange={(value) => updateContent(campaignIndex, contentIndex, { format: value })} />
                                <Field label="Topic" value={item.topic} onChange={(value) => updateContent(campaignIndex, contentIndex, { topic: value })} />
                                <Field label="Angle" value={item.angle} onChange={(value) => updateContent(campaignIndex, contentIndex, { angle: value })} />
                                <Field label="Hook" value={item.hook} onChange={(value) => updateContent(campaignIndex, contentIndex, { hook: value })} />
                                <Field label="CTA" value={item.cta} onChange={(value) => updateContent(campaignIndex, contentIndex, { cta: value })} />
                                <Field label="Planned date" value={item.plannedFor || ""} type="date" onChange={(value) => updateContent(campaignIndex, contentIndex, { plannedFor: value || null })} />
                              </div>
                            </div>
                          ))}
                          {campaign.contentItems.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No content items. Add one to keep the campaign actionable.</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </div>
  );
}
