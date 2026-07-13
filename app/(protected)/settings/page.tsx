"use client";

import { useEffect, useState } from "react";

type ConnectedAccount = {
  id: number;
  platform: string;
  account_name: string;
  status: string;
};

type SettingsResponse = {
  account: {
    id: number;
    name: string;
    email: string;
  };

  subscription: {
    plan: string;
    status: string;
    subscriptionId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };

  connectedAccounts: ConnectedAccount[];

  preferences: {
    emailNotifications: boolean;
    publishSuccess: boolean;
    publishFailure: boolean;
  };
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch("/api/settings");

      const data = await response.json();

      setSettings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-6">Loading settings...</div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white border rounded-xl p-6">
        Failed to load settings.
      </div>
    );
  }

  const subscription = settings.subscription;

  const plan = subscription.plan;

  const upgradeLabel =
    plan === "free"
      ? "Upgrade"
      : plan === "creator"
        ? "Upgrade to Agency"
        : "Current Plan";

  return (
    <div className="space-y-6">
      {/* Header */}

      <div>
        <h1 className="text-3xl font-bold">Settings</h1>

        <p className="text-gray-500 mt-2">Manage your Dizito account.</p>
      </div>

      {/* Account */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-5">Account</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>

            <input
              disabled
              value={settings.account.name}
              className="w-full border rounded-lg px-4 py-2 bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>

            <input
              disabled
              value={settings.account.email}
              className="w-full border rounded-lg px-4 py-2 bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Subscription */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-5">Subscription</h2>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Plan</span>

            <span className="capitalize font-medium">{plan}</span>
          </div>

          <div className="flex justify-between">
            <span>Status</span>

            <span className="capitalize">{subscription.status}</span>
          </div>

          {subscription.currentPeriodEnd && (
            <div className="flex justify-between">
              <span>Next Billing</span>

              <span>
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}

          {subscription.trialEnd && (
            <div className="flex justify-between">
              <span>Trial Ends</span>

              <span>
                {new Date(subscription.trialEnd).toLocaleDateString()}
              </span>
            </div>
          )}

          {subscription.subscriptionId && (
            <div className="flex justify-between">
              <span>Subscription ID</span>

              <span className="font-mono text-xs">
                {subscription.subscriptionId}
              </span>
            </div>
          )}
        </div>

        <button
          disabled={plan === "agency"}
          className="mt-6 bg-blue-600 text-white px-5 py-2 rounded-lg disabled:bg-gray-300"
        >
          {upgradeLabel}
        </button>
      </div>

      {/* Connected Accounts */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-5">Connected Accounts</h2>

        {settings.connectedAccounts.length === 0 ? (
          <p className="text-gray-500">No accounts connected.</p>
        ) : (
          <div className="space-y-4">
            {settings.connectedAccounts.map((account) => (
              <div
                key={account.id}
                className="flex justify-between items-center"
              >
                <div>
                  <p className="capitalize font-medium">{account.platform}</p>

                  <p className="text-sm text-gray-500">
                    {account.account_name}
                  </p>
                </div>

                <span className="capitalize text-green-600">
                  {account.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preferences */}

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-5">Preferences</h2>

        <div className="space-y-4">
          <label className="flex justify-between">
            <span>Email Notifications</span>

            <input
              type="checkbox"
              checked={settings.preferences.emailNotifications}
              readOnly
            />
          </label>

          <label className="flex justify-between">
            <span>Publish Success</span>

            <input
              type="checkbox"
              checked={settings.preferences.publishSuccess}
              readOnly
            />
          </label>

          <label className="flex justify-between">
            <span>Publish Failure</span>

            <input
              type="checkbox"
              checked={settings.preferences.publishFailure}
              readOnly
            />
          </label>
        </div>
      </div>

      {/* Danger */}

      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-red-700 mb-4">Danger Zone</h2>

        <p className="text-gray-700 mb-4">
          Permanently delete your Dizito account.
        </p>

        <button className="bg-red-600 text-white px-5 py-2 rounded-lg">
          Delete Account
        </button>
      </div>
    </div>
  );
}
