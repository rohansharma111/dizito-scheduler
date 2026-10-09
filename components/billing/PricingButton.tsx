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
  const isPaidPlan = plan === "growth" || plan === "pro";

  if (!billingEnabled || !isPaidPlan) {
    return (
      <Link
        href={href}
        className={`block min-h-12 w-full rounded-xl px-5 py-3 text-center text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 ${popular ? "bg-[#c7f36b] text-slate-950 shadow-sm hover:bg-[#b8e95a]" : "border border-slate-200 bg-white text-slate-800 hover:border-violet-200 hover:bg-violet-50"}`}
      >
        {label}
      </Link>
    );
  }

  async function handleSubscribe() {
    if (loading) return;
    if (plan !== "growth" && plan !== "pro") return;
    setLoading(true);
    try {
      const result = await startSubscription({ plan });
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
      className={`block min-h-12 w-full rounded-xl px-5 py-3 text-center text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 ${popular ? "bg-[#c7f36b] text-slate-950 shadow-sm hover:bg-[#b8e95a]" : "border border-slate-200 bg-white text-slate-800 hover:border-violet-200 hover:bg-violet-50"} ${loading ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {loading ? "Opening Checkout..." : label}
    </button>
  );
}
