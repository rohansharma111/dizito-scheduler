"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import { getEventIcon } from "@/lib/eventIcons";
import { getEventTitle } from "@/lib/eventFormatter";
import { timeAgo } from "@/lib/timeAgo";

type ActivityEvent = {
  id: number;
  event_type: string;
  payload: any;
  created_at: string;
};

export default function RecentActivityCard() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/activity");
      if (!response.ok) {
        throw new Error("Failed to load activity");
      }
      const data = await response.json();
      setEvents(data.slice(0, 5));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(17,24,39,0.05)]">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Recent Activity</h2>
          <p className="mt-1 text-[11px] text-slate-500">Latest changes across your workspace</p>
        </div>
        <Link
          href="/activity"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          View all <ArrowRight size={13} />
        </Link>
      </header>

      {loading && (
        <div className="space-y-4 p-5" role="status" aria-label="Loading activity">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-slate-100" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center px-5 py-8 text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Inbox size={20} />
          </span>
          <p className="text-sm font-bold text-slate-800">No activity yet</p>
          <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
            Publish your first post to see activity.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="divide-y divide-slate-100">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-base">
                {getEventIcon(event.event_type)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-words text-[12px] font-bold leading-5 text-slate-800">
                  {getEventTitle(event)}
                </p>

                {event.payload?.accountName && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {event.payload.accountName}
                  </p>
                )}

                {event.payload?.error && (
                  <p className="mt-1 truncate text-[11px] text-rose-600">
                    {event.payload.error}
                  </p>
                )}

                <p className="mt-2 text-[10px] font-medium text-slate-400">
                  {timeAgo(event.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
