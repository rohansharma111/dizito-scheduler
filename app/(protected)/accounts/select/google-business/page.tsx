"use client";

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
    return <div className="p-8">Loading Google Business locations...</div>;
  }

  if (locations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="border rounded-xl bg-white p-10 text-center">
          <div className="text-5xl mb-4">📍</div>

          <h1 className="text-2xl font-bold">No Business Locations Found</h1>

          <p className="text-gray-500 mt-3">
            Make sure your Google account has at least one Business Profile
            location.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">
        Select Google Business Locations
      </h1>

      <p className="text-gray-500 mb-8">
        Choose which Google Business locations to connect.
      </p>

      <div className="space-y-4">
        {locations.map((location) => (
          <div key={location.id} className="border rounded-lg p-5 bg-white">
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

      <div className="mt-8 flex items-center gap-4">
        <button
          disabled={connecting}
          onClick={connectLocations}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg disabled:opacity-50"
        >
          {connecting
            ? "Connecting..."
            : `Connect Selected (${selectedCount()})`}
        </button>

        <div className="text-gray-500">
          Selected: {selectedCount()} location(s)
        </div>
      </div>
    </div>
  );
}
