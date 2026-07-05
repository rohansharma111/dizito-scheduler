"use client";

import { useEffect, useState, useMemo  } from "react";
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

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);

      const response = await fetch("/api/notifications");

      const data = await response.json();

      setNotifications(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: number) {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id,
        }),
      });

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
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          markAll: true,
        }),
      });

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
        })),
      );
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
      console.error(error);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

const unreadCount =
  useMemo(
    () =>
      notifications.filter(
        (n) => !n.isRead,
      ).length,
    [notifications],
  );
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>

          <p className="text-gray-500 mt-2">
            {unreadCount} unread notification
            {unreadCount !== 1 ? "s" : ""}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="
              bg-blue-600
              text-white
              px-4
              py-2
              rounded-lg
            "
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">Loading notifications...</div>
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
  Publish posts or connect accounts
  to receive notifications.
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
              <div className="flex gap-4">
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
                  <div className="flex justify-between">
                    <h2 className="font-semibold text-sm sm:text-lg">
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

                  <p className="text-sm
    text-gray-600
    mt-2
    break-words
    line-clamp-3">{notification.message}</p>

                  <div className="mt-3 text-sm text-gray-400">
                    {formatDate(notification.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
