"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";

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
      icon: "🏠",
    },
    {
      href: "/bulk-upload",
      label: "Bulk Upload",
      icon: "📁",
    },
    {
      href: "/posts",
      label: "Posts",
      icon: "📝",
    },
    {
      href: "/drafts",
      label: "Drafts",
      icon: "📄",
    },
    {
      href: "/accounts",
      label: "Accounts",
      icon: "🔗",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: "⚙️",
    },
  ];

  return (
    <aside
      className={`
        border-r
        bg-white
        flex
        flex-col
        transition-all
        duration-300
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          {!collapsed && <h1 className="text-2xl font-bold">Dizito</h1>}

          <button onClick={toggleSidebar} className="border rounded px-2 py-1">
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="space-y-2">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                  flex
                  items-center
                  gap-3
                  px-3
                  py-2
                  rounded
                  transition-colors
                  ${
                    pathname === item.href
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100"
                  }
                `}
            >
              <span>{item.icon}</span>

              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t p-4">
        {!collapsed && (
          <>
            <div className="font-medium">{user.name}</div>

            <div className="text-sm text-gray-500 mb-3">{user.email}</div>
          </>
        )}

        <LogoutButton />
      </div>
    </aside>
  );
}
