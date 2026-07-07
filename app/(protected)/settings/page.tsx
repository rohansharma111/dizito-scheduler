"use client";

import { useEffect, useState } from "react";

type Settings = {
  email: string;
  name: string;
  plan: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>

        <p className="text-gray-500 mt-2">
          Manage your Dizito account and preferences.
        </p>
      </div>

      {/* Account */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Account</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>

            <input
              value={settings?.name || ""}
              disabled
              className="
                w-full
                border
                rounded-lg
                px-4
                py-2
                bg-gray-50
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>

            <input
              value={settings?.email || ""}
              disabled
              className="
                w-full
                border
                rounded-lg
                px-4
                py-2
                bg-gray-50
              "
            />
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Subscription</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Current Plan</p>

            <p className="text-gray-500 capitalize">{settings?.plan}</p>
          </div>

          <button
            className="
              bg-blue-600
              text-white
              px-5
              py-2
              rounded-lg
            "
          >
            Upgrade
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Preferences</h2>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span>Email notifications</span>

            <input type="checkbox" defaultChecked />
          </label>

          <label className="flex items-center justify-between">
            <span>Publish success notifications</span>

            <input type="checkbox" defaultChecked />
          </label>

          <label className="flex items-center justify-between">
            <span>Publish failure notifications</span>

            <input type="checkbox" defaultChecked />
          </label>
        </div>
      </div>

      {/* API Status */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Connected Platforms</h2>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Instagram</span>

            <span className="text-green-600">Connected</span>
          </div>

          <div className="flex justify-between">
            <span>Facebook</span>

            <span className="text-green-600">Connected</span>
          </div>

          <div className="flex justify-between">
            <span>LinkedIn</span>

            <span className="text-green-600">Connected</span>
          </div>

          <div className="flex justify-between">
            <span>Pinterest</span>

            <span className="text-green-600">Connected</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-red-700 mb-4">Danger Zone</h2>

        <p className="text-gray-700 mb-4">
          Permanently delete your Dizito account and all associated data.
        </p>

        <button
          className="
            bg-red-600
            text-white
            px-5
            py-2
            rounded-lg
          "
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
