"use client";

import { useState } from "react";
import DashboardClient from "./DashboardClient";
import UsageCard from "@/components/dashboard/UsageCard";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function Page() {
  const [usageCollapsed, setUsageCollapsed] = useState(false);

  return (
    <div className="flex gap-6">
      {/* Dashboard */}
      <div className="flex-1">
        <DashboardClient />
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <UsageCard />
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`
          hidden lg:block
          relative
          transition-all duration-300
          ${usageCollapsed ? "w-12" : "w-80"}
        `}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setUsageCollapsed(!usageCollapsed)}
          className="
            absolute
            -left-4
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

        {/* Keep mounted, just collapse */}
        <div
          className={`
            overflow-hidden
            transition-all duration-300
            ${usageCollapsed ? "opacity-0 w-0" : "opacity-100 w-full"}
          `}
        >
          <UsageCard />
        </div>
      </div>
    </div>
  );
}
