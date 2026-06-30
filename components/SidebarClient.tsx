"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";

import {
  LayoutDashboard,
  Upload,
  FileText,
  FilePen,
  Link2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export default function SidebarClient({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
  };
}) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");

    if (saved) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;

    setCollapsed(next);

    localStorage.setItem("sidebar-collapsed", JSON.stringify(next));
  }

  const menu = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/bulk-upload",
      label: "Bulk Upload",
      icon: Upload,
    },
    {
      href: "/posts",
      label: "Posts",
      icon: FileText,
    },
    {
      href: "/drafts",
      label: "Drafts",
      icon: FilePen,
    },
    {
      href: "/accounts",
      label: "Accounts",
      icon: Link2,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`
        bg-white
        border-r
        flex
        flex-col
        transition-all
        duration-200
        ease-in-out
        h-screen
        sticky
        top-0
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      {/* HEADER */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          {!collapsed && <h1 className="text-2xl font-bold">Dizito</h1>}

          <button
            onClick={toggleSidebar}
            className="
              p-2
              rounded-lg
              hover:bg-gray-100
              transition-colors
            "
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="space-y-1">
          {menu.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                    relative
                    flex
                    items-center
                    ${collapsed ? "justify-center" : "gap-3"}
                    px-3
                    py-3
                    rounded-xl
                    transition-all
                    duration-200
                    ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  `}
              >
                {/* ACTIVE BAR */}
                <div
                  className={`
                      absolute
                      left-0
                      top-1
                      bottom-1
                      w-1
                      rounded-r-full
                      ${isActive ? "bg-white" : "bg-transparent"}
                    `}
                />

                <Icon size={20} />

                {!collapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* USER */}
      <div className="mt-auto border-t p-4">
        {!collapsed && (
          <div className="mb-4">
            <div className="font-medium">{user.name}</div>

            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        )}

        <LogoutButton />
      </div>
    </aside>
  );
}
