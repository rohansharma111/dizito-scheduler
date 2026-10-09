"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, X } from "lucide-react";

type Usage = {
  plan: { id: string; name: string; price: number };
  accounts: { used: number; limit: number; remaining: number };
  posts: { created: number; published: number; limit: number; remaining: number | null };
  ai: { imagesGenerated: number; imageLimit: number; remaining: number | null };
  features: {
    bulkUpload: boolean;
    retrySystem: boolean;
    calendar: boolean;
    drafts: boolean;
    analytics: boolean;
    prioritySupport: boolean;
  };
};

function ProgressRow({
  label,
  value,
  percent,
  fillClass,
}: {
  label: string;
  value: string;
  percent: number;
  fillClass: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-slate-800">{label}</span>
        <span className="shrink-0 text-[13px] font-medium tabular-nums text-slate-500">{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div className={`h-full rounded-full transition-all duration-300 ${fillClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function FeatureStatus({ enabled }: { enabled: boolean }) {
  return (
    <span
      aria-label={enabled ? "Included" : "Not included"}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${enabled ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}
    >
      {enabled ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
    </span>
  );
}

export default function UsageCard() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUsage() {
    try {
      const response = await fetch("/api/usage");
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsage();
  }, []);

  if (loading) {
    return (
      <section aria-label="Usage" className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_32px_rgba(17,24,39,0.05)]">
        <div className="mb-4 h-5 w-24 animate-pulse rounded-md bg-slate-100" />
        <div className="h-3 w-40 animate-pulse rounded-md bg-slate-100" />
        <div className="mt-7 space-y-6">
          <div className="h-10 animate-pulse rounded-lg bg-slate-50" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-50" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-50" />
        </div>
      </section>
    );
  }

  if (!usage) {
    return (
      <section role="status" className="rounded-[22px] border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-700">
        Failed to load usage
      </section>
    );
  }

  const accountPercent = usage.accounts.limit === 0
    ? 0
    : Math.min(100, (usage.accounts.used / usage.accounts.limit) * 100);
  const postPercent = usage.posts.limit === Number.MAX_SAFE_INTEGER
    ? 0
    : Math.min(100, (usage.posts.created / usage.posts.limit) * 100);
  const aiPercent = usage.ai.imageLimit === Number.MAX_SAFE_INTEGER
    ? 0
    : Math.min(100, (usage.ai.imagesGenerated / usage.ai.imageLimit) * 100);

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(17,24,39,0.05)]">
      <div className="p-5">
        <div className="mb-7 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600" aria-hidden="true">
                <ArrowUpRight size={17} />
              </span>
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">Usage</h2>
            </div>
            <p className="pl-10 text-xs leading-5 text-slate-500">Current plan and limits</p>
          </div>
          <span className="mt-1 inline-flex shrink-0 items-center rounded-full border border-lime-200 bg-lime-50 px-3 py-1.5 text-[11px] font-extrabold capitalize text-slate-800">
            {usage.plan.name}
          </span>
        </div>

        <div className="space-y-6">
          <ProgressRow label="Accounts" value={`${usage.accounts.used} / ${usage.accounts.limit}`} percent={accountPercent} fillClass="bg-violet-500" />
          <ProgressRow label="Monthly Posts" value={`${usage.posts.created} / ${usage.posts.limit === Number.MAX_SAFE_INTEGER ? "∞" : usage.posts.limit}`} percent={postPercent} fillClass="bg-lime-500" />
          <div>
            <ProgressRow label="AI Images" value={`${usage.ai.imagesGenerated} / ${usage.ai.imageLimit === Number.MAX_SAFE_INTEGER ? "∞" : usage.ai.imageLimit}`} percent={aiPercent} fillClass="bg-violet-500" />
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              {usage.ai.remaining === null
                ? "Unlimited AI image generations"
                : `${usage.ai.remaining} AI images remaining this month`}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Features</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-slate-700">Bulk Upload</span>
              <FeatureStatus enabled={usage.features.bulkUpload} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-slate-700">Calendar</span>
              <FeatureStatus enabled={true} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-slate-700">Drafts</span>
              <FeatureStatus enabled={true} />
            </div>
          </div>
        </div>
      </div>

      {usage.plan.name === "free" && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-4">
          <button className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
            Upgrade Plan <ArrowUpRight size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
