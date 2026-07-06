"use client";

import { useEffect, useMemo, useState } from "react";
import { getEventIcon } from "@/lib/eventIcons";
import { timeAgo } from "@/lib/timeAgo";
import { groupEvents } from "@/lib/groupEvents";
import PlatformBadge from "@/components/PlatformBadge";

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

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadActivity();
  }, []);

  async function loadActivity() {
    try {
      const response = await fetch("/api/activity");

      const data = await response.json();

      setEvents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

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
    <div className="px-4 py-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Activity Feed</h1>

        <p className="text-gray-500 mt-2">
          Recent activity across all your accounts
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
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
      </div>

      {loading && (
        <div className="bg-white border rounded-lg p-8">
          Loading activity...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-5xl">📭</div>

          <h2 className="text-xl font-semibold mt-4">No activity found</h2>

          <p className="text-gray-500 mt-2">Activity will appear here</p>
        </div>
      )}

      {!loading &&
        grouped.map((group) => (
          <div key={group.label} className="mb-10">
            {" "}
            <h2>{group.label}</h2>
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

                  <div className="flex-1 bg-white border rounded-xl p-4 md:p-5 shadow-sm">
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
                        <summary className="cursor-pointer text-sm text-blue-600">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
