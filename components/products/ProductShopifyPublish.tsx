"use client";

import { useEffect, useState } from "react";

interface CommerceChannel {
  id: string;
  provider: string;
  name: string;
  status: string;
  external_account_id: string | null;
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
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/commerce/channels")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load commerce channels");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const shopifyChannels = (data.channels ?? []).filter(
          (channel: CommerceChannel) =>
            channel.provider === "shopify" && channel.status === "active",
        );
        setChannels(shopifyChannels);
        if (shopifyChannels.length === 1) setChannelId(shopifyChannels[0].id);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load commerce channels");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function publish() {
    if (!channelId || !hasVariants) return;

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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Shopify publishing failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="bg-white border rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Shopify Publishing</h2>
        <p className="text-sm text-gray-500 mt-1">
          Publish this canonical product to an active Shopify channel.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading Shopify channels...</p>}

      {!loading && channels.length === 0 && (
        <div className="text-sm text-gray-600">
          No active Shopify channel is connected. Connect one from Commerce Channels first.
        </div>
      )}

      {!loading && channels.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={channelId}
            onChange={(event) => setChannelId(event.target.value)}
            className="border rounded-lg px-3 py-2 flex-1"
            disabled={publishing}
          >
            <option value="">Select Shopify channel</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={publish}
            disabled={!channelId || !hasVariants || publishing}
            className="bg-blue-600 text-white rounded-lg px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? "Publishing..." : "Publish to Shopify"}
          </button>
        </div>
      )}

      {!hasVariants && (
        <p className="text-sm text-amber-700 mt-3">
          Add at least one product variant before publishing to Shopify.
        </p>
      )}

      {message && <p className="text-sm text-green-700 mt-3">{message}</p>}
      {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
    </section>
  );
}
