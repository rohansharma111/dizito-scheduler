"use client";

import { useEffect, useState } from "react";

interface CommerceListing {
  id: string;
  channel_id: string;
  product_id: string;
  status: "draft" | "active" | "paused" | "archived";
  sync_status: string;
  external_id: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  provider: string;
  channel_name: string;
  product_name: string;
  created_at: string;
  updated_at: string;
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function CommerceListingsPage() {
  const [listings, setListings] = useState<CommerceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/commerce/listings")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Unable to load commerce listings");
        return data;
      })
      .then((data) => setListings(data.listings ?? []))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load commerce listings"))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(listingId: string, status: CommerceListing["status"]) {
    setUpdatingId(listingId);
    setError(null);
    try {
      const response = await fetch(`/api/commerce/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update listing");
      setListings((current) => current.map((listing) => listing.id === listingId ? { ...listing, ...data.listing } : listing));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update listing");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Commerce Listings</h1>
        <p className="text-gray-600 mt-2">View and manage channel-specific listings created from the canonical Dizito catalog.</p>
      </div>

      {loading && <div className="text-gray-600">Loading...</div>}
      {error && <div className="border border-red-200 bg-red-50 rounded p-4 text-red-700">{error}</div>}

      {!loading && !error && listings.length === 0 && <div className="border rounded p-6 text-gray-600">No commerce listings have been created yet.</div>}

      {!loading && listings.length > 0 && (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="border rounded-xl p-5 bg-white">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="font-semibold text-lg">{listing.product_name}</div>
                  <div className="text-sm text-gray-600 mt-1">{listing.provider} · {listing.channel_name}</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 text-sm">
                  <select
                    value={listing.status}
                    onChange={(event) => updateStatus(listing.id, event.target.value as CommerceListing["status"])}
                    disabled={updatingId === listing.id}
                    className="border rounded-full px-3 py-1 capitalize bg-white"
                    aria-label={`Listing ${listing.id} status`}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                  <span className="border rounded-full px-3 py-1 capitalize">{listing.sync_status}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-sm">
                <div><div className="text-gray-500">Listing ID</div><div className="font-mono mt-1">{listing.id}</div></div>
                <div><div className="text-gray-500">External ID</div><div className="font-mono mt-1 break-all">{listing.external_id ?? "Not published"}</div></div>
                <div><div className="text-gray-500">Last synced</div><div className="mt-1">{formatDate(listing.last_synced_at)}</div></div>
              </div>

              {listing.last_error && <div className="mt-4 border border-red-200 bg-red-50 rounded p-3 text-sm text-red-700">{listing.last_error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
