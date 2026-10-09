"use client";

import { useState } from "react";
import DashboardClient from "./DashboardClient";
import UsageCard from "@/components/dashboard/UsageCard";
import { ChevronRight, ChevronLeft } from "lucide-react";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";

export default function Page() {
  const [usageCollapsed, setUsageCollapsed] = useState(true);

  return (
    <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:gap-5 xl:gap-6">
      <div className="min-w-0 flex-1">
        <DashboardClient />

        {/* Mobile usage below dashboard */}
        <div className="mt-6 space-y-4 lg:hidden">
          <UsageCard />
          <RecentActivityCard />
        </div>
      </div>

      {/* Desktop side panel */}
      <aside
        className={`relative hidden shrink-0 transition-[width] duration-300 ease-in-out lg:block ${usageCollapsed ? "w-11" : "w-[320px] xl:w-[350px]"}`}
      >
        <button
          type="button"
          aria-label={usageCollapsed ? "Expand usage and recent activity" : "Collapse usage and recent activity"}
          aria-expanded={!usageCollapsed}
          aria-controls="dashboard-usage-panel"
          onClick={() => setUsageCollapsed((collapsed) => !collapsed)}
          className="absolute -left-3 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_4px_12px_rgba(17,24,39,0.10)] transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          {usageCollapsed ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
        </button>

        {/* Keep the panel mounted */}
        <div
          id="dashboard-usage-panel"
          aria-hidden={usageCollapsed}
          className={`space-y-3 transition-opacity duration-200 ${usageCollapsed ? "pointer-events-none overflow-hidden opacity-0" : "opacity-100"}`}
        >
          <UsageCard />
          <RecentActivityCard />
        </div>
      </aside>
    </div>
  );
}
