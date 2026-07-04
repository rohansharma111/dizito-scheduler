import DashboardClient from "./DashboardClient";

import UsageCard from "@/components/dashboard/UsageCard";

export default function Page() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <DashboardClient />
      </div>

      <div>
        <UsageCard />
      </div>
    </div>
  );
}
