"use client";

import { useEffect, useState } from "react";

type PlatformStat = {
  platform: string;
  count: number;
};

type Analytics = {
  published: number;
  failed: number;
  accounts: number;
  successRate: number;
  platforms: PlatformStat[];
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const response = await fetch("/api/analytics");

      const data = await response.json();

      setAnalytics(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics</div>;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}

      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>

        <p className="text-gray-500 mt-2">
          Overview of your social publishing activity
        </p>
      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">Published</div>

          <div className="text-3xl font-bold mt-2">{analytics.published}</div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">Failed</div>

          <div className="text-3xl font-bold mt-2">{analytics.failed}</div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">Connected Accounts</div>

          <div className="text-3xl font-bold mt-2">{analytics.accounts}</div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">Success Rate</div>

          <div className="text-3xl font-bold mt-2">
            {analytics.successRate}%
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Platform Distribution</h2>

        <div className="space-y-6">
          {analytics.platforms.map((platform) => {
            const total = analytics.platforms.reduce(
              (sum, p) => sum + p.count,
              0,
            );

            const percentage =
              total > 0 ? ((platform.count / total) * 100).toFixed(1) : "0";

            return (
              <div key={platform.platform}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium capitalize">
                    {platform.platform}
                  </span>

                  <span>
                    {platform.count}
                    {" ("}
                    {percentage}
                    %)
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {analytics.platforms.length === 0 && (
            <div className="text-gray-500">No published posts yet</div>
          )}
        </div>
      </div>

      {/* Summary */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>

        <div className="space-y-2">
          <div>
            Total Published: <strong>{analytics.published}</strong>
          </div>

          <div>
            Total Failed: <strong>{analytics.failed}</strong>
          </div>

          <div>
            Connected Accounts: <strong>{analytics.accounts}</strong>
          </div>

          <div>
            Success Rate: <strong>{analytics.successRate}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
