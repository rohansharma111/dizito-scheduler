"use client";

import { useEffect, useMemo, useState } from "react";
import { getEventIcon } from "@/lib/eventIcons";
import { timeAgo } from "@/lib/timeAgo";
import { groupEvents } from "@/lib/groupEvents";
import PlatformBadge from "@/components/PlatformBadge";
import { DizitoButton, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

type ActivityEvent = {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: number;
  payload: any;
  created_at: string;
};

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  async function loadActivity() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/activity");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load activity");
      if (!Array.isArray(data)) throw new Error("Unexpected activity response");
      setEvents(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);



  function getTitle(event: ActivityEvent) {
    switch (event.event_type) {
      case "TARGET_PUBLISHED":
        return `${event.payload?.platform ?? ""} published successfully`;

      case "TARGET_FAILED":
        return `${event.payload?.platform ?? ""} publishing failed`;

      case "TARGET_RETRY_SCHEDULED":
        return `${event.payload?.platform ?? ""} retry scheduled`;

      case "TARGET_PERMANENT_FAILED":
        return `${event.payload?.platform ?? ""} permanently failed`;

      case "ACCOUNT_CONNECTED":
        return "Account connected";

      case "ACCOUNT_DISCONNECTED":
        return "Account disconnected";

      case "ACCOUNT_RECONNECTED":
        return "Account reconnected";

      case "POST_CREATED":
        return "Post created";

      default:
        return event.event_type;
    }
  }

  function getDescription(event: ActivityEvent) {
    const payload = event.payload || {};

    switch (event.event_type) {
      case "TARGET_PUBLISHED":
        return payload.accountName || "Published successfully";

      case "TARGET_FAILED":
        return payload.error || "Unknown error";

      case "TARGET_RETRY_SCHEDULED":
        return `Retry ${payload.retry || 0} scheduled in ${
          payload.retryDelay || 0
        } minutes`;

      case "TARGET_PERMANENT_FAILED":
        return payload.error || "Permanent failure";

      case "ACCOUNT_CONNECTED":
      case "ACCOUNT_DISCONNECTED":
      case "ACCOUNT_RECONNECTED":
        return payload.accountName || "";

      default:
        return "";
    }
  }

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const title = getTitle(event).toLowerCase();

      const desc = getDescription(event).toLowerCase();

      const platform = (event.payload?.platform || "").toLowerCase();

      const matchesSearch =
        !search ||
        title.includes(search.toLowerCase()) ||
        desc.includes(search.toLowerCase()) ||
        platform.includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" || event.event_type.includes(filter);

      return matchesSearch && matchesFilter;
    });
  }, [events, search, filter]);

  const grouped = groupEvents(filtered);

  return (
    <DizitoPage>
      <DizitoPageHeader eyebrow="Measure" title="Activity feed" description="Recent publishing and account activity across your Dizito workspace." action={<DizitoButton variant="secondary" onClick={() => void loadActivity()} disabled={loading}>Refresh activity</DizitoButton>} />

      <DizitoCard className="mb-6" tone="soft"><div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activity..."
          className="
            w-full
            sm:flex-1
            border
            rounded-lg
            px-4
            py-2
  "
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="
            w-full
            sm:w-48
            border
            rounded-lg
            px-4
            py-2
  "
        >
          <option value="all">All</option>

          <option value="PUBLISHED">Published</option>

          <option value="FAILED">Failed</option>

          <option value="RETRY">Retry</option>

          <option value="ACCOUNT">Accounts</option>
        </select>
      </div></DizitoCard>

      {error && <DizitoState kind="error" title="Activity could not load" description={error} action={<DizitoButton variant="secondary" onClick={() => void loadActivity()}>Try again</DizitoButton>} />}

      {loading && (
        <div className="space-y-6" aria-label="Loading activity" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full border border-gray-200 bg-gray-100" />
                {item < 2 && <div className="mt-2 min-h-12 w-px flex-1 bg-gray-200" />}
              </div>
              <DizitoCard className="min-w-0 flex-1 !p-4 md:!p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-2/5 rounded bg-gray-200" />
                  <div className="h-3 w-3/4 rounded bg-gray-100" />
                  <div className="h-3 w-1/4 rounded bg-gray-100" />
                </div>
              </DizitoCard>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <DizitoState
          kind="empty"
          title={events.length === 0 ? "No activity yet" : "No matching activity"}
          description={events.length === 0 ? "Publishing and account events will appear here as your workspace gets active." : "Try a different search term or change the event filter to see more activity."}
          action={events.length > 0 && (search || filter !== "all") ? <DizitoButton variant="secondary" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</DizitoButton> : undefined}
        />
      )}

      {!loading && !error &&
        grouped.map((group) => (
          <div key={group.label} className="mb-10">
            {" "}
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{group.label}</h2>
            <div className="space-y-6">
              {group.events.map((event, index) => (
                <div key={event.id} className="flex">
                  <div className="flex flex-col items-center mr-6">
                    <div className="w-10 h-10 rounded-full border bg-white flex items-center justify-center text-xl">
                      {getEventIcon(event.event_type)}
                    </div>

                    {index !== group.events.length - 1 && (
                      <div className="w-px flex-1 bg-gray-300 mt-2" />
                    )}
                  </div>

                  <DizitoCard className="min-w-0 flex-1 !p-4 md:!p-5">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <h3 className="font-semibold text-base md:text-lg break-words">
                            {getTitle(event)}
                          </h3>

                          {event.payload?.platform && (
                            <PlatformBadge platform={event.payload.platform} />
                          )}
                        </div>

                        <p className="text-gray-600 mt-2">
                          {getDescription(event)}
                        </p>
                      </div>

                      <div className="text-sm text-gray-400 whitespace-nowrap">
                        {timeAgo(event.created_at)}
                      </div>
                    </div>

                    {event.payload && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-semibold text-[var(--dizito-violet)]">
                          View details
                        </summary>

                        <pre
                          className="
                            mt-3
                            bg-gray-50
                            rounded-lg
                            p-3
                            text-[10px]
                            md:text-xs
                            overflow-x-auto
                            whitespace-pre-wrap
                            break-words
  "
                        >
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </DizitoCard>
                </div>
              ))}
            </div>
          </div>
        ))}
    </DizitoPage>
  );
}
