"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startSubscription } from "@/lib/billing/frontend";

type Props = {
  plan: "free" | "growth" | "pro";
  href: string;
  label: string;
  popular?: boolean;
};

export default function PricingButton({ plan, href, label, popular = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const billingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
  const paidPlan = plan === "growth" || plan === "pro" ? plan : null;

  if (!billingEnabled || !paidPlan) {
    return (
      <Link
        href={href}
        className={`mt-9 block w-full rounded-lg px-6 py-3 text-center font-medium transition ${popular ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 hover:bg-gray-200"}`}
      >
        {label}
      </Link>
    );
  }

  async function handleSubscribe() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await startSubscription({ plan: paidPlan });
      if (!result.success) {
        alert(result.error);
        return;
      }
      alert("Checkout completed. Dizito will activate the plan after Razorpay confirms the subscription.");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      className={`mt-9 block w-full rounded-lg px-6 py-3 text-center font-medium transition ${popular ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 hover:bg-gray-200"} ${loading ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {loading ? "Opening Checkout..." : label}
    </button>
  );
}
