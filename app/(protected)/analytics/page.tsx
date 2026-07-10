"use client";

import { useEffect, useState } from "react";
import { getEventTitle } from "@/lib/eventFormatter";
import { timeAgo } from "@/lib/timeAgo";
import Link from "next/link";
import { getEventDescription } from "@/lib/eventDescription";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaPinterest,
} from "react-icons/fa";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";

type PlatformStat = {
  platform: string;
  count: number;
};

type DailyStat = {
  day: string;
  count: number;
};

type RecentEvent = {
  event_type: string;
  payload: any;
  created_at: string;
};

type Analytics = {
  cards: {
    published: number;
    failed: number;
    scheduled: number;
    accounts: number;
    successRate: number;
  };

  platforms: PlatformStat[];

  daily: DailyStat[];

  topPlatform: string | null;

  insights: string[];

  recent: RecentEvent[];

  premium?: boolean;

  error?: string;
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

  if (analytics?.premium) {
    return (
      <div className="p-8">
        <div className="bg-white border rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">🔒</div>

          <h1 className="text-3xl font-bold">Analytics</h1>

          <p className="text-gray-500 mt-4">
            Analytics is available on Creator and Agency plans.
          </p>

          <Link
            href="/pricing"
            className="
      mt-8
      inline-block
      bg-blue-600
      text-white
      px-6
      py-3
      rounded-lg
  "
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics</div>;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold">Analytics Overview</div>

          <span
            className="
    bg-yellow-400
    text-black
    text-xs
    font-semibold
    px-2
    py-1
    rounded-full
  "
          >
            PREMIUM
          </span>
        </div>
        <div className="mt-2 opacity-90">
          Track publishing performance across all platforms.
        </div>

        <div className="text-xs opacity-70 mt-4">
          Last updated: {new Date().toLocaleString()}
        </div>

        <div className="grid grid-cols-3 gap-8 mt-6">
          <div>
            <div className="text-sm">Published</div>

            <div className="text-2xl font-bold">
              {analytics.cards.published}
            </div>
          </div>

          <div>
            <div className="text-sm">Success Rate</div>

            <div className="text-2xl font-bold">
              {analytics.cards.successRate}%
            </div>
          </div>

          <div>
            <div className="text-sm">Accounts</div>

            <div className="text-2xl font-bold">{analytics.cards.accounts}</div>
          </div>
        </div>
      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">📈Published</div>

          <div className="text-3xl font-bold mt-2">
            {analytics.cards.published}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">📅Scheduled</div>

          <div className="text-3xl font-bold mt-2">
            {analytics.cards.scheduled}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">❌Failed</div>

          <div className="text-3xl font-bold mt-2">
            {analytics.cards.failed}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">🔗Connected Accounts</div>

          <div className="text-3xl font-bold mt-2">
            {analytics.cards.accounts}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="text-gray-500">✅Success Rate</div>

          <div className="text-3xl font-bold mt-2">
            {analytics.cards.successRate}%
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{
                width: `${analytics.cards.successRate}%`,
              }}
            />
          </div>

          <div className="text-xs text-gray-500 mt-2">
            {analytics.cards.successRate >= 95
              ? "Excellent"
              : analytics.cards.successRate >= 80
                ? "Good"
                : "Needs attention"}
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
                  <span className="flex items-center gap-2 font-medium capitalize">
                    {platform.platform === "instagram" && (
                      <FaInstagram className="text-pink-500" />
                    )}

                    {platform.platform === "facebook" && (
                      <FaFacebook className="text-blue-600" />
                    )}

                    {platform.platform === "linkedin" && (
                      <FaLinkedin className="text-blue-700" />
                    )}

                    {platform.platform === "pinterest" && (
                      <FaPinterest className="text-red-600" />
                    )}

                    {platform.platform === "google-business" && (
                      <GoogleBusinessIcon size={20} className="w-5 h-5" />
                    )}

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

          <div className="mt-6 text-sm text-gray-500">
            Total Platforms Used:
            <strong className="ml-1">{analytics.platforms.length}</strong>
          </div>

          {analytics.platforms.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>

              <div className="font-semibold">
                Analytics will appear after your first published post
              </div>

              <div className="text-gray-500 mt-2">
                Schedule and publish your first post.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Platform */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Top Platform</h2>

        {!analytics.topPlatform && (
          <div className="text-gray-500">No publishing data yet</div>
        )}

        {analytics.topPlatform === "instagram" && (
          <div className="flex items-center gap-3 text-2xl font-bold">
            <FaInstagram className="text-pink-500" />
            Instagram
          </div>
        )}

        {analytics.topPlatform === "facebook" && (
          <div className="flex items-center gap-3 text-2xl font-bold">
            <FaFacebook className="text-blue-600" />
            Facebook
          </div>
        )}

        {analytics.topPlatform === "linkedin" && (
          <div className="flex items-center gap-3 text-2xl font-bold">
            <FaLinkedin className="text-blue-700" />
            LinkedIn
          </div>
        )}

        {analytics.topPlatform === "pinterest" && (
          <div className="flex items-center gap-3 text-2xl font-bold">
            <FaPinterest className="text-red-600" />
            Pinterest
          </div>
        )}

        {analytics.topPlatform === "google-business" && (
          <div className="flex items-center gap-3 text-2xl font-bold">
            <GoogleBusinessIcon size={24} className="w-6 h-6" />
            Google Business
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Insights</h2>

        <div className="space-y-3">
          {analytics.insights.length === 0 ? (
            <div className="text-gray-500">
              Insights will appear as you publish more posts.
            </div>
          ) : (
            analytics.insights.map((insight, index) => (
              <div key={index} className="flex gap-3">
                <span>💡</span>

                <span>{insight}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>

        <div className="space-y-4">
          {analytics.recent.length === 0 ? (
            <div className="text-gray-500">No recent activity.</div>
          ) : (
            analytics.recent.map((event, index) => (
              <div key={index} className="border-b pb-3">
                <div className="font-medium">{getEventTitle(event)}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {getEventDescription(event)}
                </div>

                <div className="text-sm text-gray-500">
                  {timeAgo(event.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
