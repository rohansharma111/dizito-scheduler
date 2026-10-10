"use client";

import { useEffect, useMemo, useState } from "react";

interface CommerceChannel {
  id: string;
  provider: string;
  name: string;
  status: string;
  external_account_id: string | null;
}

interface CommerceListing {
  id: string;
  channel_id: string;
  product_id: string;
  status: string;
  sync_status: string;
  external_id: string | null;
  last_synced_at: string | null;
  last_error: string | null;
}

interface ProductShopifyPublishProps {
  productId: string;
  hasVariants: boolean;
}

export default function ProductShopifyPublish({
  productId,
  hasVariants,
}: ProductShopifyPublishProps) {
  const [channels, setChannels] = useState<CommerceChannel[]>([]);
  const [listings, setListings] = useState<CommerceListing[]>([]);
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.channel_id === channelId),
    [listings, channelId],
  );

  const published = Boolean(selectedListing?.external_id);

  useEffect(() => {
    let cancelled = false;

    async function loadCommerceState() {
      try {
        const [channelsResponse, listingsResponse] = await Promise.all([
          fetch("/api/commerce/channels"),
          fetch("/api/commerce/listings"),
        ]);

        const channelsData = await channelsResponse.json();
        const listingsData = await listingsResponse.json();

        if (!channelsResponse.ok) {
          throw new Error(channelsData.error || "Unable to load commerce channels");
        }
        if (!listingsResponse.ok || !listingsData.success) {
          throw new Error(listingsData.error || "Unable to load commerce listings");
        }

        if (cancelled) return;

        const shopifyChannels: CommerceChannel[] = (
          channelsData.channels ?? []
        ).filter(
          (channel: CommerceChannel) =>
            channel.provider === "shopify" && channel.status === "active",
        );
        const productListings: CommerceListing[] = (
          listingsData.listings ?? []
        ).filter(
          (listing: CommerceListing) =>
            String(listing.product_id) === String(productId),
        );

        setChannels(shopifyChannels);
        setListings(productListings);

        if (shopifyChannels.length === 1) {
          setChannelId(shopifyChannels[0].id);
        } else if (shopifyChannels.length > 1) {
          const existingChannel = shopifyChannels.find((channel) =>
            productListings.some(
              (listing) =>
                String(listing.channel_id) === String(channel.id) &&
                Boolean(listing.external_id),
            ),
          );
          setChannelId(existingChannel?.id ?? "");
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load commerce state",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCommerceState();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function publish() {
    if (!channelId || !hasVariants || publishing || syncing || published) return;

    setPublishing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/commerce/shopify/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, productId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Shopify publishing failed");
      }
      setMessage("Product published to Shopify successfully.");
      setListings((current) =>
        current.some((listing) => listing.channel_id === channelId)
          ? current
          : [
              ...current,
              {
                id: String(data.listing?.id ?? ""),
                channel_id: channelId,
                product_id: productId,
                status: data.listing?.status ?? "active",
                sync_status: "synced",
                external_id: data.listing?.external_id ?? null,
                last_synced_at: new Date().toISOString(),
                last_error: null,
              },
            ],
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Shopify publishing failed",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function sync() {
    if (!channelId || !hasVariants || publishing || syncing || !published) return;

    setSyncing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/commerce/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, productId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Shopify sync failed");
      }
      setMessage("Product changes synced to Shopify successfully.");
      setListings((current) =>
        current.map((listing) =>
          listing.channel_id === channelId
            ? {
                ...listing,
                sync_status: "synced",
                last_synced_at: new Date().toISOString(),
                last_error: null,
              }
            : listing,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Shopify sync failed",
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Shopify Publishing</h2>
        <p className="text-sm text-gray-500 mt-1">
          Publish this canonical product to an active Shopify channel, or sync changes to an existing listing.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading Shopify channels...</p>}

      {!loading && channels.length === 0 && (
        <div className="text-sm text-gray-600">
          No active Shopify channel is connected. Connect one from Commerce Channels first.
        </div>
      )}

      {!loading && channels.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={channelId}
              onChange={(event) => {
                setChannelId(event.target.value);
                setMessage(null);
                setError(null);
              }}
              className="border rounded-lg px-3 py-2 flex-1"
              disabled={publishing || syncing}
            >
              <option value="">Select Shopify channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>

            {!published ? (
              <button
                type="button"
                onClick={publish}
                disabled={!channelId || !hasVariants || publishing || syncing}
                className="rounded-xl bg-[#c7f36b] px-5 py-2.5 font-bold text-slate-950 shadow-sm transition hover:bg-[#b8e95a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? "Publishing..." : "Publish to Shopify"}
              </button>
            ) : (
              <button
                type="button"
                onClick={sync}
                disabled={!channelId || !hasVariants || publishing || syncing}
                className="rounded-xl border border-[#c7f36b] bg-[#f7fce9] px-5 py-2.5 font-bold text-slate-900 transition hover:bg-[#eaf8c9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync Changes"}
              </button>
            )}
          </div>

          {selectedListing && (
            <div className="mt-4 border rounded-lg p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Listing status:</span>
                <span className="border rounded-full px-2.5 py-1 capitalize">
                  {selectedListing.status}
                </span>
                <span className="border rounded-full px-2.5 py-1 capitalize">
                  {selectedListing.sync_status}
                </span>
              </div>
              {selectedListing.last_synced_at && (
                <p className="text-gray-500 mt-2">
                  Last synced: {new Date(selectedListing.last_synced_at).toLocaleString()}
                </p>
              )}
              {selectedListing.last_error && (
                <p className="text-red-700 mt-2">{selectedListing.last_error}</p>
              )}
            </div>
          )}
        </>
      )}

      {!hasVariants && (
        <p className="text-sm text-amber-700 mt-3">
          Add at least one product variant before publishing or syncing to Shopify.
        </p>
      )}

      {message && <p className="text-sm text-green-700 mt-3">{message}</p>}
      {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
    </section>
  );
}
