"use client";

import { Search, User, Menu } from "lucide-react";
import Link from "next/link";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-black/5 bg-white/80 px-4 backdrop-blur-xl md:px-7 lg:px-9">
      <div className="flex min-w-0 items-center gap-3 md:gap-5">
        <button onClick={onMenuClick} className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>
        <Link href="/dashboard" className="lg:hidden text-lg font-black tracking-tight text-slate-900">dizito<span className="text-violet-600">.</span></Link>
        <div className="relative hidden md:block">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search your business…" className="h-10 w-64 rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm outline-none transition focus:border-violet-300 focus:bg-white md:w-80" />
        </div>
        <div className="hidden xl:flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1.5 text-[11px] font-bold text-slate-700"><span className="h-2 w-2 rounded-full bg-lime-500" />Your business, in motion</div>
      </div>
      <div className="flex items-center gap-1 md:gap-3">
        <div className="rounded-xl p-1.5 hover:bg-slate-100"><NotificationDropdown /></div>
        <button className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Profile"><User size={18} /></button>
      </div>
    </header>
  );
}
