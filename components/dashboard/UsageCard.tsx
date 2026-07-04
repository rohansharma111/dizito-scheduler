"use client";

import { useEffect, useState } from "react";

type Usage = {
  plan: {
    id: string;
    name: string;
    price: number;
  };

  accounts: {
    used: number;
    limit: number;
    remaining: number;
  };

  posts: {
    created: number;
    published: number;
    limit: number;
    remaining: number | null;
  };

  features: {
    bulkUpload: boolean;
    retrySystem: boolean;
    calendar: boolean;
    drafts: boolean;
    analytics: boolean;
    prioritySupport: boolean;
  };
};

export default function UsageCard() {
  const [usage, setUsage] = useState<Usage | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  async function loadUsage() {
    try {
      const response = await fetch("/api/usage");

      const data = await response.json();

      setUsage(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-6">Loading usage...</div>
    );
  }

  if (!usage) {
    return (
      <div className="bg-white border rounded-xl p-6">Failed to load usage</div>
    );
  }

  const accountPercent =
    usage.accounts.limit === 0
      ? 0
      : Math.min(100, (usage.accounts.used / usage.accounts.limit) * 100);

  const postPercent =
    usage.posts.limit === Number.MAX_SAFE_INTEGER
      ? 0
      : Math.min(100, (usage.posts.created / usage.posts.limit) * 100);

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Usage</h2>

          <p className="text-gray-500 text-sm">Current plan and limits</p>
        </div>

        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
          {usage.plan.name}
        </span>
      </div>

      {/* Accounts */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="font-medium">Accounts</span>

          <span className="text-gray-500">
            {usage.accounts.used} / {usage.accounts.limit}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${accountPercent}%`,
            }}
          />
        </div>
      </div>

      {/* Posts */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="font-medium">Monthly Posts</span>

          <span className="text-gray-500">
            {usage.posts.created} /{" "}
            {usage.posts.limit === Number.MAX_SAFE_INTEGER
              ? "∞"
              : usage.posts.limit}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{
              width: `${postPercent}%`,
            }}
          />
        </div>
      </div>

      {/* Features */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Features</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Bulk Upload</span>

            <span>{usage.features.bulkUpload ? "✅" : "❌"}</span>
          </div>

          <div className="flex justify-between">
            <span>Calendar</span>

            <span>✅</span>
          </div>

          <div className="flex justify-between">
            <span>Drafts</span>

            <span>✅</span>
          </div>
        </div>
      </div>

      {/* Upgrade */}
      {usage.plan.name === "free" && (
        <button className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
          Upgrade Plan
        </button>
      )}
    </div>
  );
}
