import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import AppShell from "@/components/AppShell";

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
    <AppShell
      user={{
        id: (session.user as any).id,

        name: session.user?.name,

        email: session.user?.email,

        plan: (session.user as any).plan || "free",
      }}
    >
      {children}
    </AppShell>
  );
}
