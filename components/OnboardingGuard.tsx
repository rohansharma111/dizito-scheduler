"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

export default function OnboardingGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const pathname = usePathname();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    check();
  }, []);

  async function check() {
    try {
      const response = await fetch("/api/onboarding");

      const data = await response.json();

      if (!data.onboarding_completed && pathname !== "/onboarding") {
        router.replace("/onboarding");

        return;
      }

      if (data.onboarding_completed && pathname === "/onboarding") {
        router.replace("/dashboard");

        return;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="
        h-screen
        flex
        items-center
        justify-center
      "
      >
        Loading...
      </div>
    );
  }

  return children;
}
