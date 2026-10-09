"use client";

import { DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

import { useEffect, useState } from "react";

type GoogleBusinessLocation = {
  id: string;
  name: string;
  storeCode?: string;
  accountName: string;
};

export default function GoogleBusinessSelectionPage() {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);

  const [loading, setLoading] = useState(true);

  const [connecting, setConnecting] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/google-business/locations");

        const data = await response.json();

        setLocations(data || []);

        const initial: Record<string, boolean> = {};

        for (const location of data || []) {
          initial[location.id] = false;
        }

        setSelected(initial);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function selectedCount() {
    return Object.values(selected).filter(Boolean).length;
  }

  async function connectLocations() {
    const selectedLocations = locations
      .filter((location) => selected[location.id])
      .map((location) => ({
        locationId: location.id,
        locationName: location.name,
        storeCode: location.storeCode,
        accountName: location.accountName,
      }));

    if (selectedLocations.length === 0) {
      alert("Please select at least one location");

      return;
    }

    try {
      setConnecting(true);

      const response = await fetch("/api/google-business/connect", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          locations: selectedLocations,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.redirect || "/accounts";
      } else {
        alert(data.error || "Failed to connect Google Business locations");
      }
    } catch (error) {
      console.error(error);

      alert("Failed to connect Google Business locations");
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return <DizitoPage className="px-4 sm:px-6"><DizitoState kind="empty" title="Loading Google Business locations" description="Please wait while available resources are loaded." /></DizitoPage>;
  }

  if (locations.length === 0) {
    return (
      <DizitoPage className="max-w-4xl px-4 sm:px-6">
        <div className="border rounded-xl bg-white p-10 text-center">
      </DizitoPage>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <DizitoPageHeader eyebrow="Connected accounts" title="Select Google Business locations" description="Choose which Google Business locations to connect." />

      <div className="space-y-4">
        {locations.map((location) => (
          <div key={location.id} className="dizito-card">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">📍 {location.name}</div>

                <div className="text-sm text-gray-500 mt-2">
                  Business Account:
                  <span className="font-medium ml-1">
                    {location.accountName}
                  </span>
                </div>

                {location.storeCode && (
                  <div className="text-sm text-gray-400 mt-2">
                    Store Code:
                    <span className="ml-1">{location.storeCode}</span>
                  </div>
                )}
              </div>

              <input
                type="checkbox"
                checked={selected[location.id] || false}
                onChange={(e) =>
                  setSelected((prev) => ({
                    ...prev,
                    [location.id]: e.target.checked,
                  }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          disabled={connecting}
          onClick={connectLocations}
          className="dizito-button dizito-button-primary disabled:opacity-50"
        >
          {connecting
            ? "Connecting..."
            : `Connect Selected (${selectedCount()})`}
        </button>

        <div className="text-gray-500">
          Selected: {selectedCount()} location(s)
        </div>
      </div>
    </DizitoPage>
  );
}
