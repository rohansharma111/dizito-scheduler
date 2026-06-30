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
  X,
} from "lucide-react";

export default function SidebarClient({
  user,
  mobileOpen = false,
  onClose,
}: {
  user: {
    name?: string | null;
    email?: string | null;
  };
  mobileOpen?: boolean;
  onClose?: () => void;
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
    <>
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="
            fixed
            inset-0
            bg-black/50
            z-40
            lg:hidden
          "
          onClick={onClose}
        />
      )}

      <aside
        className={`
          bg-white
          border-r
          flex
          flex-col
          transition-all
          duration-200
          ease-in-out

          lg:relative
          lg:translate-x-0

          fixed
          left-0
          top-0
          z-50

          h-screen

          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}

          lg:flex

          ${collapsed ? "lg:w-20" : "lg:w-64"}

          w-64
        `}
      >
        {/* HEADER */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!collapsed && <h1 className="text-2xl font-bold">Dizito</h1>}

            <div className="flex gap-2">
              {/* MOBILE CLOSE */}
              <button
                onClick={onClose}
                className="
                  lg:hidden
                  p-2
                  rounded-lg
                  hover:bg-gray-100
                "
              >
                <X size={20} />
              </button>

              {/* DESKTOP COLLAPSE */}
              <button
                onClick={toggleSidebar}
                className="
                  hidden
                  lg:block
                  p-2
                  rounded-lg
                  hover:bg-gray-100
                "
              >
                {collapsed ? (
                  <PanelLeftOpen size={20} />
                ) : (
                  <PanelLeftClose size={20} />
                )}
              </button>
            </div>
          </div>

          {/* NAV */}
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
                  onClick={() => onClose?.()}
                  className={`
                      relative
                      flex
                      items-center
                      ${collapsed ? "lg:justify-center" : "gap-3"}
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

                  {(!collapsed || window.innerWidth < 1024) && (
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
    </>
  );
}
