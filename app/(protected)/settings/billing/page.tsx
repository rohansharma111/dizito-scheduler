"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BillingData = {
  plan: string;

  planDetails: {
    name: string;
    price: number;
    accounts: number;
    monthlyPosts: number;
    bulkUpload: boolean;
    retrySystem: boolean;
    calendar: boolean;
    drafts: boolean;
    analytics: boolean;
    prioritySupport: boolean;
  };

  subscription: {
    provider: string | null;
    id: string | null;
    status: string | null;
    subscriptionPlan: string | null;
    renewalDate: string | null;
    trialDaysLeft: number;
  };

  usage: {
    accountsUsed: number;
    accountsLimit: number;
    postsUsed: number;
    postsLimit: number;
    published: number;
    bulkUploads: number;
  };

  features: {
    bulkUpload: boolean;
    retrySystem: boolean;
    calendar: boolean;
    drafts: boolean;
    analytics: boolean;
    prioritySupport: boolean;
  };

  billingHistory: {
    event: string;
    amount: number;
    created_at: string;
  }[];

  earlyAdopter: boolean;
};

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);

  const [loading, setLoading] = useState(true);

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",

    authenticated: "bg-yellow-100 text-yellow-700",

    cancelled: "bg-red-100 text-red-700",

    halted: "bg-orange-100 text-orange-700",

    completed: "bg-gray-100 text-gray-700",

    payment_failed: "bg-red-100 text-red-700",

    free: "bg-gray-100 text-gray-700",
  };

  useEffect(() => {
    loadBilling();
  }, []);

  async function loadBilling() {
    try {
      const response = await fetch("/api/billing");

      const data = await response.json();

      setBilling(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading billing...</div>;
  }

  if (!billing) {
    return <div className="p-8">Failed to load billing</div>;
  }

  const accountPercent =
    billing.usage.accountsLimit > 0
      ? (billing.usage.accountsUsed / billing.usage.accountsLimit) * 100
      : 0;

  const postPercent =
    billing.usage.postsLimit > 0 &&
    billing.usage.postsLimit !== Number.MAX_SAFE_INTEGER
      ? (billing.usage.postsUsed / billing.usage.postsLimit) * 100
      : 0;

  return (
    <div className="p-8 space-y-8">
      {/* Hero */}

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 text-white">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>

          {billing.earlyAdopter && (
            <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-semibold">
              🔥 Early Adopter
            </span>
          )}
        </div>

        <p className="mt-2 opacity-90">
          Manage your plan, subscription and usage.
        </p>

        <div className="mt-6 flex gap-8">
          <div>
            <div className="text-sm">Current Plan</div>

            <div className="text-2xl font-bold">{billing.planDetails.name}</div>
          </div>

          <div>
            <div className="text-sm">Status</div>

            <div className="text-2xl font-bold">
              {billing.subscription.status || "Free"}
            </div>
          </div>

          <div>
            <div className="text-sm">Monthly Price</div>

            <div className="text-2xl font-bold">
              ₹{billing.planDetails.price}
            </div>
          </div>
        </div>
      </div>

      {/* Trial Banner */}

      {billing.subscription.trialDaysLeft > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          🎉 Trial ends in{" "}
          <strong>{billing.subscription.trialDaysLeft} days</strong>
        </div>
      )}

      {/* Usage */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Accounts Usage</h2>

          <div className="flex justify-between mb-2">
            <span>
              {billing.usage.accountsUsed}/{billing.usage.accountsLimit}
            </span>

            <span>{Math.round(accountPercent)}%</span>
          </div>

          <div className="w-full bg-gray-200 h-3 rounded">
            <div
              className="bg-blue-600 h-3 rounded"
              style={{
                width: `${Math.min(accountPercent, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Posts Usage</h2>

          <div className="flex justify-between mb-2">
            <span>
              {billing.usage.postsUsed}/
              {billing.usage.postsLimit === Number.MAX_SAFE_INTEGER
                ? "∞"
                : billing.usage.postsLimit}
            </span>

            <span>
              {billing.usage.postsLimit === Number.MAX_SAFE_INTEGER
                ? "∞"
                : `${Math.round(postPercent)}%`}
            </span>
          </div>

          <div className="w-full bg-gray-200 h-3 rounded">
            <div
              className="bg-green-600 h-3 rounded"
              style={{
                width: `${Math.min(postPercent, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Subscription */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Subscription</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-gray-500">Provider</div>

            <div className="font-medium">
              {billing.subscription.provider || "-"}
            </div>
          </div>

          <div>
            <div className="text-gray-500">Status</div>

            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusColors[billing.subscription.status ?? "free"]
              }`}
            >
              {billing.subscription.status ?? "Free"}
            </span>
          </div>

          <div>
            <div className="text-gray-500">Subscription ID</div>

            <div className="font-medium">{billing.subscription.id || "-"}</div>
          </div>

          <div>
            <div className="text-gray-500">Renewal Date</div>

            <div className="font-medium">
              {billing.subscription.renewalDate
                ? new Date(
                    billing.subscription.renewalDate,
                  ).toLocaleDateString()
                : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Features</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>{billing.features.bulkUpload ? "✅" : "❌"} Bulk Upload</div>

          <div>{billing.features.analytics ? "✅" : "❌"} Analytics</div>

          <div>{billing.features.retrySystem ? "✅" : "❌"} Retry System</div>

          <div>{billing.features.calendar ? "✅" : "❌"} Calendar</div>

          <div>{billing.features.drafts ? "✅" : "❌"} Drafts</div>

          <div>
            {billing.features.prioritySupport ? "✅" : "❌"} Priority Support
          </div>
        </div>
      </div>

      {/* Billing History */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Billing History</h2>

        {billing.billingHistory.length === 0 ? (
          <div className="text-gray-500">No billing history yet.</div>
        ) : (
          <div className="space-y-3">
            {billing.billingHistory.map((item, index) => (
              <div key={index} className="flex justify-between border-b pb-3">
                <div>{item.event}</div>

                <div className="text-right">
                  <div>₹{item.amount}</div>

                  <div className="text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}

      <div className="flex gap-4">
        {billing.plan === "free" && (
          <>
            <Link
              href="/pricing"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              Upgrade To Creator
            </Link>

            <Link
              href="/pricing"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg"
            >
              Upgrade To Agency
            </Link>
          </>
        )}

        {billing.plan === "creator" && (
          <>
            <Link
              href="/pricing"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg"
            >
              Upgrade To Agency
            </Link>

            <button className="bg-red-600 text-white px-6 py-3 rounded-lg">
              Cancel Subscription
            </button>
          </>
        )}

        {billing.plan === "agency" && (
          <button className="bg-red-600 text-white px-6 py-3 rounded-lg">
            Cancel Subscription
          </button>
        )}
      </div>
    </div>
  );
}
