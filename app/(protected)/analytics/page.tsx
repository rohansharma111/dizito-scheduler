"use client";

import { useEffect, useState } from "react";
import { getEventTitle } from "@/lib/eventFormatter";
import { timeAgo } from "@/lib/timeAgo";
import Link from "next/link";
import { getEventDescription } from "@/lib/eventDescription";
import { FaInstagram, FaFacebook, FaLinkedin, FaPinterest } from "react-icons/fa";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";
import { DizitoBadge, DizitoButton, DizitoCard, DizitoMetric, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

type PlatformStat = { platform: string; count: number };
type DailyStat = { day: string; count: number };
type RecentEvent = { event_type: string; payload: any; created_at: string };
type Analytics = {
  cards: { published: number; failed: number; scheduled: number; accounts: number; successRate: number };
  platforms: PlatformStat[];
  daily: DailyStat[];
  topPlatform: string | null;
  insights: string[];
  recent: RecentEvent[];
  premium?: boolean;
  error?: string;
};

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "instagram") return <FaInstagram />;
  if (platform === "facebook") return <FaFacebook />;
  if (platform === "linkedin") return <FaLinkedin />;
  if (platform === "pinterest") return <FaPinterest />;
  if (platform === "google-business") return <GoogleBusinessIcon size={18} className="h-[18px] w-[18px]" />;
  return null;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadAnalytics() {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/analytics");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load analytics");
      if (!data?.cards || !Array.isArray(data.platforms) || !Array.isArray(data.daily) || !Array.isArray(data.insights) || !Array.isArray(data.recent)) throw new Error("Unexpected analytics response");
      setAnalytics(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAnalytics(); }, []);



  if (loading) {
    return (
      <DizitoPage>
        <DizitoPageHeader eyebrow="Measure" title="Analytics" description="Track publishing performance across your connected channels." />
        <DizitoCard><div role="status" aria-label="Loading analytics" className="animate-pulse space-y-4"><div className="h-5 w-40 rounded bg-slate-100"/><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">{[0,1,2,3,4].map((item)=><div key={item} className="h-24 rounded-xl bg-slate-100"/> )}</div><div className="grid gap-4 lg:grid-cols-2"><div className="h-56 rounded-xl bg-slate-100"/><div className="h-56 rounded-xl bg-slate-100"/></div></div></DizitoCard>
      </DizitoPage>
    );
  }

  if (analytics?.premium) {
    return (
      <DizitoPage>
        <DizitoCard className="text-center" tone="ai">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🔒</div>
          <DizitoBadge tone="ai">PREMIUM</DizitoBadge>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Analytics</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">Analytics is available on Creator and Agency plans.</p>
          <Link href="/pricing" className="dizito-button dizito-button-primary mt-7">View plans</Link>
        </DizitoCard>
      </DizitoPage>
    );
  }

  if (!analytics) {
    return (
      <DizitoPage>
        <DizitoPageHeader eyebrow="Measure" title="Analytics" />
        <DizitoState kind="error" title="Unable to load analytics" description={loadError || "Please refresh and try again."} action={<DizitoButton variant="secondary" onClick={() => void loadAnalytics()}>Try again</DizitoButton>} />
      </DizitoPage>
    );
  }

  const cards = [
    ["Published", analytics.cards.published],
    ["Scheduled", analytics.cards.scheduled],
    ["Failed", analytics.cards.failed],
    ["Connected accounts", analytics.cards.accounts],
    ["Success rate", `${analytics.cards.successRate}%`],
  ];

  return (
    <DizitoPage>
      <DizitoPageHeader
        eyebrow="Measure"
        title="Analytics"
        description="Track publishing performance across your connected channels."
        action={<DizitoBadge tone="ai">PREMIUM</DizitoBadge>}
      />

      <DizitoCard className="mb-5" tone="dark">
        <div className="flex flex-col gap-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Publishing overview</div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">A focused view of distribution health across your connected platforms.</p>
            <div className="mt-3 text-xs text-gray-400">Last updated: {new Date().toLocaleString()}</div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><div className="text-xs text-gray-400">Published</div><div className="mt-1 text-2xl font-extrabold">{analytics.cards.published}</div></div>
            <div><div className="text-xs text-gray-400">Success rate</div><div className="mt-1 text-2xl font-extrabold">{analytics.cards.successRate}%</div></div>
            <div><div className="text-xs text-gray-400">Accounts</div><div className="mt-1 text-2xl font-extrabold">{analytics.cards.accounts}</div></div>
          </div>
        </div>
      </DizitoCard>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <DizitoMetric key={label} label={String(label)} value={value} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DizitoCard>
          <div className="mb-5">
            <h2 className="text-lg font-extrabold">Platform distribution</h2>
            <p className="mt-1 text-sm text-gray-500">Where your publishing activity is concentrated.</p>
          </div>
          {analytics.platforms.length === 0 ? (
            <DizitoState kind="empty" title="No publishing data yet" description="Schedule and publish your first post to start seeing platform analytics." />
          ) : (
            <div className="space-y-5">
              {analytics.platforms.map((platform) => {
                const total = analytics.platforms.reduce((sum, item) => sum + item.count, 0);
                const percentage = total > 0 ? ((platform.count / total) * 100).toFixed(1) : "0";
                return (
                  <div key={platform.platform}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-semibold capitalize"><span className="text-[var(--dizito-violet)]"><PlatformIcon platform={platform.platform} /></span>{platform.platform}</span>
                      <span className="shrink-0 text-gray-500">{platform.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[var(--dizito-violet)]" style={{ width: `${percentage}%` }} /></div>
                  </div>
                );
              })}
              <div className="border-t border-gray-100 pt-4 text-xs text-gray-500">Total platforms used: <strong>{analytics.platforms.length}</strong></div>
            </div>
          )}
        </DizitoCard>

        <DizitoCard>
          <div className="mb-5"><h2 className="text-lg font-extrabold">Top platform</h2><p className="mt-1 text-sm text-gray-500">Your strongest publishing destination by activity.</p></div>
          {!analytics.topPlatform ? (
            <DizitoState kind="empty" title="No publishing data yet" description="Your top platform will appear after publishing activity is recorded." />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-5 text-xl font-extrabold capitalize">
              <span className="text-[var(--dizito-violet)]"><PlatformIcon platform={analytics.topPlatform} /></span>{analytics.topPlatform.replace("-", " ")}
            </div>
          )}
        </DizitoCard>

        <DizitoCard>
          <div className="mb-5"><h2 className="text-lg font-extrabold">Insights</h2><p className="mt-1 text-sm text-gray-500">Signals derived from your publishing activity.</p></div>
          {analytics.insights.length === 0 ? (
            <DizitoState kind="empty" title="More data needed" description="Insights will appear as you publish more posts." />
          ) : (
            <div className="space-y-3">{analytics.insights.map((insight, index) => <div key={index} className="flex gap-3 rounded-xl bg-gray-50 p-3 text-sm leading-6"><span>💡</span><span>{insight}</span></div>)}</div>
          )}
        </DizitoCard>

        <DizitoCard>
          <div className="mb-5"><h2 className="text-lg font-extrabold">Recent activity</h2><p className="mt-1 text-sm text-gray-500">Recent events contributing to your analytics view.</p></div>
          {analytics.recent.length === 0 ? (
            <DizitoState kind="empty" title="No recent activity" description="Publishing and account events will appear here." />
          ) : (
            <div className="space-y-1">{analytics.recent.map((event, index) => (
              <div key={index} className="border-b border-gray-100 py-3 last:border-0">
                <div className="font-semibold">{getEventTitle(event)}</div>
                <div className="mt-1 text-sm text-gray-600">{getEventDescription(event)}</div>
                <div className="mt-1 text-xs text-gray-400">{timeAgo(event.created_at)}</div>
              </div>
            ))}</div>
          )}
        </DizitoCard>
      </div>
    </DizitoPage>
  );
}
