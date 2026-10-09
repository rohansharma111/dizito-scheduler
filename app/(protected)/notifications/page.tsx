"use client";

import { useEffect, useState, useMemo } from "react";
import { DizitoPage, DizitoPageHeader } from "@/components/dizito/DizitoUI";
import {
  getNotificationIcon,
  getNotificationColor,
} from "@/lib/notificationIcons";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  payload?: any;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load notifications");
      if (!Array.isArray(data)) throw new Error("Unexpected notifications response");
      setNotifications(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);



  async function markRead(id: number) {
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id,
        }),
      });
      if (!response.ok) throw new Error("Could not mark notification as read");

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                isRead: true,
              }
            : n,
        ),
      );
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Could not mark notification as read");
    }
  }

  async function markAllRead() {
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          markAll: true,
        }),
      });
      if (!response.ok) throw new Error("Could not mark notifications as read");

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
        })),
      );
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Could not mark notifications as read");
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );
  return (
    <DizitoPage className="px-4 sm:px-6">
      {/* Header */}
      <DizitoPageHeader eyebrow="Workspace" title="Notifications" description={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`} />

      {error && <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={loadNotifications} className="dizito-button dizito-button-secondary self-start sm:self-auto">Retry</button></div>}

      <div className="mb-5 flex justify-start">

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="dizito-button dizito-button-primary"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500" role="status">Loading notifications...</div>
      )}

      {/* Empty */}
      {!loading && notifications.length === 0 && (
        <div
          className="
            bg-white
            rounded-xl
            border
            p-12
            text-center
          "
        >
          <div className="text-6xl mb-4">🔔</div>

          <h2 className="text-xl font-semibold">No notifications</h2>

          <p className="text-gray-500 mt-2">
            Publish posts or connect accounts to receive notifications.
          </p>
        </div>
      )}

      {/* Notifications */}
      {!loading && notifications.length > 0 && (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                    bg-white
                    border
                    rounded-xl
                    p-3 sm:p-5
                    shadow-sm
                    transition
                    hover:shadow-md
                    cursor-pointer
                    ${!notification.isRead ? "border-blue-300 bg-blue-50" : ""}
                  `}
              onClick={() => {
                if (!notification.isRead) {
                  markRead(notification.id);
                }
              }}
            >
              <div className="flex min-w-0 gap-3 sm:gap-4">
                {/* Icon */}
                <div
                  className={`
                      text-lg sm:text-2xl
                      ${getNotificationColor(notification.type)}
                    `}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h2 className="min-w-0 break-words font-semibold text-sm sm:text-lg">
                      {notification.title}
                    </h2>

                    {!notification.isRead && (
                      <div
                        className="
                            w-3
                            h-3
                            bg-blue-600
                            rounded-full
                            mt-2
                          "
                      />
                    )}
                  </div>

                  <p
                    className="text-sm
    text-gray-600
    mt-2
    break-words
    line-clamp-3"
                  >
                    {notification.message}
                  </p>

                  <div className="mt-3 text-sm text-gray-400">
                    {formatDate(notification.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DizitoPage>
  );
}
