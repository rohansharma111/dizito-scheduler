"use client";

import { useState } from "react";
import DashboardClient from "./DashboardClient";
import UsageCard from "@/components/dashboard/UsageCard";
import { ChevronRight, ChevronLeft } from "lucide-react";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";

export default function Page() {
  const [usageCollapsed, setUsageCollapsed] = useState(true);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <DashboardClient />

        {/* Mobile usage below dashboard */}
        <div className="mt-6 lg:hidden">
          <UsageCard />

          <RecentActivityCard />
        </div>
      </div>

      {/* Desktop side panel */}
      <div
        className={`
      hidden lg:block
      relative
      transition-all
      duration-300
      ${usageCollapsed ? "w-12" : "w-[350px]"}
    `}
      >
        {/* Collapse Button */}
        <button
          onClick={() => setUsageCollapsed(!usageCollapsed)}
          className="
            absolute
            -left-5
            top-4
            z-10
            bg-white
            border
            rounded-full
            p-1
            shadow
            hover:bg-gray-50
          "
        >
          {usageCollapsed ? (
            <ChevronLeft size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>

        {/* Keep the panel mounted */}
        <div
          className={`
            overflow-hidden transition-all duration-300
            ${usageCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}
          `}
        >
          <UsageCard />

          <RecentActivityCard />
        </div>
      </div>
    </div>
  );
}
