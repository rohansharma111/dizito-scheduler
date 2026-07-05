"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);

  const [count, setCount] = useState(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCount();
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadCount() {
    try {
      const response = await fetch("/api/notifications/count");

      const data = await response.json();

      setCount(data.count || 0);
    } catch (error) {
      console.error(error);
    }
  }

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

      setCount((c) => Math.max(0, c - 1));
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

      setCount(0);
    } catch (error) {
      console.error(error);
    }
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleString();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell */}
      <button onClick={() => setOpen(!open)} className="relative text-2xl">
        🔔
        {count > 0 && (
          <span
            className="
              absolute
              -top-2
              -right-2
              bg-red-500
              text-white
              text-xs
              rounded-full
              px-2
              py-0.5
              min-w-[20px]
              text-center
            "
          >
            {count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute
            right-0
            mt-3
            w-96
            bg-white
            border
            rounded-xl
            shadow-xl
            z-50
          "
        >
          {/* Header */}
          <div
            className="
              flex
              justify-between
              items-center
              p-4
              border-b
            "
          >
            <h3 className="font-bold">Notifications</h3>

            {count > 0 && (
              <button
                className="
                  text-sm
                  text-blue-600
                "
                onClick={markAllRead}
              >
                Mark all
              </button>
            )}
          </div>

          {/* Body */}
          <div
            className="
              max-h-[450px]
              overflow-y-auto
            "
          >
            {loading && <div className="p-6 text-center">Loading...</div>}

            {!loading && notifications.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No notifications
              </div>
            )}

            {!loading &&
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    border-b
                    p-4
                    cursor-pointer
                    hover:bg-gray-50
                    ${!notification.isRead ? "bg-blue-50" : ""}
                  `}
                  onClick={() => markRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className={getNotificationColor(notification.type)}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1">
                      <div className="font-medium">{notification.title}</div>

                      <div
                        className="
                          text-sm
                          text-gray-600
                          mt-1
                        "
                      >
                        {notification.message}
                      </div>

                      <div
                        className="
                          text-xs
                          text-gray-400
                          mt-2
                        "
                      >
                        {formatTime(notification.createdAt)}
                      </div>
                    </div>

                    {!notification.isRead && (
                      <div
                        className="
                          w-2
                          h-2
                          bg-blue-600
                          rounded-full
                          mt-2
                        "
                      />
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t">
            <Link
              href="/notifications"
              className="
                block
                text-center
                text-blue-600
                font-medium
              "
              onClick={() => setOpen(false)}
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
