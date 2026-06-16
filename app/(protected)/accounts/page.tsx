import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AccountsClient from "./AccountsClient";

export default async function Page() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <AccountsClient />;
}