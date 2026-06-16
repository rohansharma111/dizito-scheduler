import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AccountsClient from "./AccountsClient";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <AccountsClient />;
}
