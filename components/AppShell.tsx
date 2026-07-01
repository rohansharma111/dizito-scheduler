"use client";

import { ReactNode, useState } from "react";

import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
import Footer from "./Footer";

export default function AppShell({
  children,
  user,
}: {
  children: ReactNode;

  user: {
    id: number;
    name?: string | null;
    email?: string | null;
    plan?: string;
  };
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const closeSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:flex">
        <Sidebar user={user} plan={user.plan || "free"} />
      </div>

      {/* MOBILE OVERLAY */}
      {mobileSidebarOpen && (
        <div
          className="
            fixed
            inset-0
            z-40
            bg-black/50
            lg:hidden
          "
          onClick={closeSidebar}
        />
      )}

      {/* MOBILE SIDEBAR */}
      <div
        className={`
          fixed
          top-0
          left-0
          h-full
          z-50
          lg:hidden
          transition-transform
          duration-300
          ease-in-out
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          user={user}
          plan={user.plan || "free"}
          mobileOpen={mobileSidebarOpen}
          onClose={closeSidebar}
        />
      </div>

      {/* MAIN AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader onMenuClick={() => setMobileSidebarOpen(true)} />

        <main
          className="
            flex-1
            overflow-auto
            p-4
            md:p-6
          "
        >
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
