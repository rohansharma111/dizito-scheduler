import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={session.user} />

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
