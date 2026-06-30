import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";

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
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <Sidebar
        user={{
          name: session.user?.name,
          email: session.user?.email,
        }}
      />

      {/* CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP HEADER */}
        <AppHeader />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
