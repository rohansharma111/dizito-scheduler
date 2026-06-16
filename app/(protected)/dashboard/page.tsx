import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function Page() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient />;
}