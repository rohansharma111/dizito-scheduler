"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, Send } from "lucide-react";

type ContentItem = {
  id: number;
  campaignId: number;
  contentType: string;
  format: string | null;
  topic: string | null;
  angle: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  mediaId: number | null;
  status: string;
  plannedFor: string | null;
  postIds: number[];
};

type Account = { id: number; account_name: string; platform: string; status: string };

function defaultSchedule(plannedFor: string | null) {
  if (plannedFor) {
    const date = new Date(plannedFor);
    if (!Number.isNaN(date.getTime())) {
      date.setHours(10, 0, 0, 0);
      return date.toISOString().slice(0, 16);
    }
  }
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date.toISOString().slice(0, 16);
}

function displayCopy(item: ContentItem) {
  return [item.hook, item.body, item.topic ? `Topic: ${item.topic}` : null, item.cta]
    .filter(Boolean)
    .join("\n\n");
}

export default function MarketingContentClient() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [schedule, setSchedule] = useState<Record<number, string>>({});

  async function load() {
    setLoading(true);
    try {
      const [contentResponse, accountResponse] = await Promise.all([
        fetch("/api/marketing/content-items"),
        fetch("/api/social-accounts"),
      ]);
      const contentData = await contentResponse.json();
      const accountData = await accountResponse.json();
      if (!contentResponse.ok) throw new Error(contentData.error || "Failed to load content");
      if (!accountResponse.ok) throw new Error(accountData.error || "Failed to load accounts");
      setItems(contentData.contentItems || []);
      setAccounts(accountData || []);
      setSelectedAccounts((current) => current.length ? current : (accountData || []).map((a: Account) => a.id));
      const nextSchedule: Record<number, string> = {};
      for (const item of contentData.contentItems || []) nextSchedule[item.id] = defaultSchedule(item.plannedFor);
      setSchedule(nextSchedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load marketing content");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleAccount(id: number) {
    setSelectedAccounts((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function createPost(item: ContentItem) {
    if (selectedAccounts.length === 0) {
      setError("Select at least one social account first.");
      return;
    }
    setBusyId(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/marketing/content-items/${item.id}/create-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAccounts, scheduleTime: new Date(schedule[item.id]).toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create post");
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, status: "converted", postIds: [...value.postIds, Number(data.post.id)] } : value));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><CalendarClock size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketing Content</h1>
            <p className="mt-1 text-sm text-gray-500">Turn approved Content Items into scheduled Posts. The existing scheduler and publishers handle delivery.</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border bg-gray-50 p-4">
          <div className="mb-2 text-sm font-semibold text-gray-700">Publish to</div>
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => {
              const selected = selectedAccounts.includes(account.id);
              return <button key={account.id} onClick={() => toggleAccount(account.id)} className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"}`}>{account.platform} · {account.account_name}</button>;
            })}
            {accounts.length === 0 && <span className="text-sm text-gray-500">No connected social accounts.</span>}
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? <div className="py-16 text-center text-gray-500">Loading marketing content...</div> : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-gray-500">No content items yet. Generate and approve a weekly plan first.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>{item.contentType}</span><span>·</span><span>{item.format || "content"}</span>
                    {item.status === "converted" && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-green-700 normal-case tracking-normal"><CheckCircle2 size={13} /> Converted</span>}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-gray-900">{item.topic || item.hook || "Untitled content item"}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{displayCopy(item) || "No copy yet."}</p>
                </div>
                <div className="w-full lg:w-80">
                  <label className="text-sm font-medium text-gray-700">Schedule</label>
                  <input type="datetime-local" value={schedule[item.id] || ""} onChange={(event) => setSchedule((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-2 w-full rounded-xl border border-gray-300 p-3" disabled={item.status === "converted"} />
                  <button onClick={() => createPost(item)} disabled={item.status === "converted" || busyId === item.id || accounts.length === 0} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {busyId === item.id ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
                    {item.status === "converted" ? "Post Created" : "Create Scheduled Post"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
