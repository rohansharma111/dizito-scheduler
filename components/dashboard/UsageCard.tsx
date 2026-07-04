"use client";

import { useEffect, useState } from "react";

type Usage = {
  plan: string;
  accountsUsed: number;
  accountsLimit: number;
  postsUsed: number;
  postsLimit: number;
  bulkUpload: boolean;
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
    usage.accountsLimit === 0
      ? 0
      : Math.min(100, (usage.accountsUsed / usage.accountsLimit) * 100);

  const postPercent =
    usage.postsLimit === Number.MAX_SAFE_INTEGER
      ? 0
      : Math.min(100, (usage.postsUsed / usage.postsLimit) * 100);

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Usage</h2>

          <p className="text-gray-500 text-sm">Current plan and limits</p>
        </div>

        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
          {usage.plan}
        </span>
      </div>

      {/* Accounts */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="font-medium">Accounts</span>

          <span className="text-gray-500">
            {usage.accountsUsed} / {usage.accountsLimit}
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
            {usage.postsUsed} /{" "}
            {usage.postsLimit === Number.MAX_SAFE_INTEGER
              ? "∞"
              : usage.postsLimit}
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

            <span>{usage.bulkUpload ? "✅" : "❌"}</span>
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
      {usage.plan === "free" && (
        <button className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
          Upgrade Plan
        </button>
      )}
    </div>
  );
}
