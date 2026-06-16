import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function Page() {
  return <DashboardClient />;
}
