"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startSubscription } from "@/lib/billing/frontend";

type Props = {
  plan: "free" | "creator" | "agency";

  href: string;

  label: string;

  popular?: boolean;
};

export default function PricingButton({
  plan,
  href,
  label,
  popular = false,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  /*
    Enable real billing only
    when you want.
  */
  const billingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

  /*
    Only Creator & Agency
    use Razorpay.
  */
  const isPaidPlan = plan === "creator" || plan === "agency";

  /*
    Billing disabled OR free plan
    Keep current behaviour.
  */
  if (!billingEnabled || !isPaidPlan) {
    return (
      <Link
        href={href}
        className={`mt-10 block w-full rounded-lg px-6 py-3 text-center font-medium transition ${
          popular
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-100 hover:bg-gray-200"
        }`}
      >
        {label}
      </Link>
    );
  }

  const paidPlan: "creator" | "agency" = plan;

  async function handleSubscribe() {
    if (loading) return;

    setLoading(true);

    try {
      const result = await startSubscription({
        plan: paidPlan,
      });

      if (!result.success) {
        alert(result.error);
        return;
      }

      alert(
        "Subscription started successfully.\n\nYour account will automatically upgrade once Razorpay confirms the payment.",
      );

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
      className={`mt-10 block w-full rounded-lg px-6 py-3 text-center font-medium transition ${
        popular
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-gray-100 hover:bg-gray-200"
      } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {loading ? "Opening Checkout..." : label}
    </button>
  );
}
