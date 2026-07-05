"use client";

import { useState } from "react";
import DashboardClient from "./DashboardClient";
import UsageCard from "@/components/dashboard/UsageCard";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function Page() {
  const [usageCollapsed, setUsageCollapsed] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Dashboard */}
      <div className={usageCollapsed ? "lg:col-span-3" : "lg:col-span-2"}>
        <DashboardClient />
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <UsageCard />
      </div>

      {/* Desktop */}
      <div className="hidden lg:block relative">
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

        {!usageCollapsed && <UsageCard />}
      </div>
    </div>
  );
}
