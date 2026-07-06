"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    load();
  }, []);

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

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg">Recent Activity</h2>

        <Link
          href="/activity"
          className="
            text-sm
            text-blue-600
            hover:text-blue-700
          "
        >
          View all
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-6 text-center text-gray-500">Loading activity...</div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && (
        <div className="p-6 text-center">
          <div className="text-3xl mb-2">📭</div>

          <div className="font-medium">No activity yet</div>

          <div className="text-sm text-gray-500 mt-1">
            Publish your first post to see activity.
          </div>
        </div>
      )}

      {/* Events */}
      {!loading && events.length > 0 && (
        <div>
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`
                flex
                gap-3
                p-4
                hover:bg-gray-50
                transition
                ${index !== events.length - 1 ? "border-b" : ""}
              `}
            >
              {/* Icon */}
              <div
                className="
                  flex-shrink-0
                  w-9
                  h-9
                  rounded-full
                  bg-gray-100
                  flex
                  items-center
                  justify-center
                  text-lg
                "
              >
                {getEventIcon(event.event_type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {getEventTitle(event)}
                </div>

                {event.payload?.accountName && (
                  <div className="text-xs text-gray-500 mt-1">
                    {event.payload.accountName}
                  </div>
                )}

                {event.payload?.error && (
                  <div className="text-xs text-red-500 mt-1 truncate">
                    {event.payload.error}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">
                  {timeAgo(event.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
