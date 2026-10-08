"use client";

import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";

export default function AppShell({ children, user }: { children: ReactNode; user: { id:number; name?:string|null; email?:string|null; plan?:string } }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeSidebar = () => setMobileSidebarOpen(false);
  return (
    <div className="flex h-screen bg-transparent">
      <div className="hidden lg:flex"><Sidebar user={user} plan={user.plan || "free"} /></div>
      {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={closeSidebar} />}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar user={user} plan={user.plan || "free"} mobileOpen={mobileSidebarOpen} onClose={closeSidebar} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto px-4 py-5 md:px-7 md:py-7 lg:px-9">{children}</main>
      </div>
    </div>
  );
}
