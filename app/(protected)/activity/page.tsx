"use client";

import { useEffect, useState } from "react";
import { getEventIcon } from "@/lib/eventIcons";

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
        return `Account connected`;

      case "ACCOUNT_DISCONNECTED":
        return `Account disconnected`;

      case "ACCOUNT_RECONNECTED":
        return `Account reconnected`;

      case "POST_CREATED":
        return `Post created`;

      default:
        return event.event_type;
    }
  }

  function getDescription(event: ActivityEvent) {
    const payload = event.payload || {};

    switch (event.event_type) {
      case "TARGET_PUBLISHED":
        return `${payload.accountName || ""}`;

      case "TARGET_FAILED":
        return payload.error || "Unknown error";

      case "TARGET_RETRY_SCHEDULED":
        return `Retry ${payload.retry || 0} scheduled in ${
          payload.retryDelay || 0
        } minutes`;

      case "TARGET_PERMANENT_FAILED":
        return payload.error || "Permanent failure";

      case "ACCOUNT_CONNECTED":
        return payload.accountName || "";

      case "ACCOUNT_DISCONNECTED":
        return payload.accountName || "";

      case "ACCOUNT_RECONNECTED":
        return payload.accountName || "";

      default:
        return JSON.stringify(payload);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Activity Feed</h1>

        <p className="text-gray-500 mt-2">
          Recent activity across all your connected accounts
        </p>
      </div>

      {loading && (
        <div className="bg-white border rounded-lg p-8">
          Loading activity...
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">📭</div>

          <div className="text-xl font-semibold">No activity yet</div>

          <div className="text-gray-500 mt-2">
            Your publishing activity will appear here
          </div>
        </div>
      )}

      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white border rounded-lg p-5 hover:shadow-sm transition"
          >
            <div className="flex gap-4">
              <div className="text-2xl">{getEventIcon(event.event_type)}</div>

              <div className="flex-1">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{getTitle(event)}</h3>

                    <p className="text-gray-600 mt-1">
                      {getDescription(event)}
                    </p>
                  </div>

                  <div className="text-sm text-gray-400 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>

                {event.payload && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-blue-600">
                      View details
                    </summary>

                    <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
