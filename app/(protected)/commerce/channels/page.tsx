"use client";

import { FormEvent, useEffect, useState } from "react";
import { DizitoCard, DizitoPage, DizitoPageHeader } from "@/components/dizito/DizitoUI";

interface CommerceChannel {
  id: string;
  provider: string;
  name: string;
  status: string;
  external_account_id: string | null;
  created_at: string;
}

interface AmazonVerificationResult {
  marketplaceId: string;
  marketplace: {
    id: string;
    countryCode: string;
    name: string;
    defaultLanguageCode: string;
    defaultCurrencyCode: string;
    domainName: string;
  };
  isParticipating?: boolean;
  participation?: {
    isParticipating: boolean;
    hasSuspendedListings: boolean;
  };
  requestId: string | null;
  rateLimit: string | null;
}

export default function CommerceChannelsPage() {
  const [shop, setShop] = useState("");
  const [channels, setChannels] = useState<CommerceChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadChannels() {
    try {
      const response = await fetch("/api/commerce/channels");
      const data = (await response.json()) as { channels?: CommerceChannel[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load channels");
      setChannels(data.channels ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadChannels();
  }, []);

  function connectShopify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = shop.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!normalized) return;

    window.location.href = `/api/commerce/shopify/connect?shop=${encodeURIComponent(normalized)}`;
  }

  function connectAmazon() {
    window.location.href = "/api/commerce/amazon/connect";
  }

  async function verifyAmazon(channel: CommerceChannel) {
    setVerifyingId(channel.id);
    setVerificationMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/commerce/amazon/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        result?: AmazonVerificationResult;
        error?: string;
      };

      if (!response.ok || !data.success || !data.result) {
        throw new Error(data.error ?? "Amazon connection verification failed");
      }

      const marketplaceName = data.result.marketplace.name;
      setVerificationMessage(
        `Amazon connection verified for ${marketplaceName}. SP-API request ${data.result.requestId ?? "completed"}.`,
      );
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Amazon connection verification failed",
      );
    } finally {
      setVerifyingId(null);
    }
  }

  async function setChannelStatus(channel: CommerceChannel, status: "active" | "inactive") {
    if (status === "inactive" && !window.confirm(`Disconnect ${channel.name}?`)) return;

    setUpdatingId(channel.id);
    setError(null);

    try {
      const response = await fetch(`/api/commerce/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to update channel");

      setChannels((current) =>
        current.map((item) => (item.id === channel.id ? { ...item, status } : item)),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update channel");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DizitoPage className="px-4 sm:px-6">
      <DizitoPageHeader eyebrow="Commerce" title="Commerce channels" description="Connect sales channels without changing your canonical Dizito product catalog." />

      <DizitoCard className="mb-5">
        <h2 className="text-xl font-semibold">Connect Shopify</h2>
        <p className="text-sm text-gray-600 mt-1">
          Enter the store&apos;s myshopify.com domain to begin Shopify authorization.
        </p>

        <form onSubmit={connectShopify} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            placeholder="your-store.myshopify.com"
            className="border rounded px-3 py-2 flex-1"
            autoComplete="url"
          />
          <button type="submit" className="bg-blue-600 text-white rounded px-5 py-2">
            Connect Shopify
          </button>
        </form>
      </div>

      <div className="border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold">Connect Amazon India</h2>
        <p className="text-sm text-gray-600 mt-1">
          Authorize Dizito to access your Amazon Seller Central account through SP-API.
        </p>
        <button
          type="button"
          onClick={connectAmazon}
          className="mt-4 bg-orange-600 text-white rounded px-5 py-2"
        >
          Connect Amazon India
        </button>
      </div>

      {verificationMessage && (
        <div className="border border-green-300 rounded p-4 mb-6 text-green-700">
          {verificationMessage}
        </div>
      )}

      {error && <div className="border border-red-300 rounded p-4 mb-6 text-red-700">{error}</div>}

      <div>
        <h2 className="text-xl font-semibold mb-4">Connected Commerce Channels</h2>

        {loading && <div className="text-gray-600">Loading...</div>}

        {!loading && channels.length === 0 && (
          <div className="border rounded p-6 text-gray-600">No commerce channels connected yet.</div>
        )}

        {!loading && channels.map((channel) => {
          const active = channel.status === "active";
          const updating = updatingId === channel.id;
          const verifying = verifyingId === channel.id;
          const amazon = channel.provider === "amazon";

          return (
            <div key={channel.id} className="border rounded p-4 mb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{channel.name}</div>
                  <div className="text-sm text-gray-600 capitalize">{channel.provider}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm">{active ? "🟢 Active" : channel.status}</div>
                  {amazon && active && (
                    <button
                      type="button"
                      onClick={() => void verifyAmazon(channel)}
                      disabled={verifying || updating}
                      className="border rounded px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      {verifying ? "Verifying..." : "Verify"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void setChannelStatus(channel, active ? "inactive" : "active")}
                    disabled={updating || verifying || channel.status === "error"}
                    className="border rounded px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {updating ? "Updating..." : active ? "Disconnect" : "Reconnect"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </DizitoCard>
    </DizitoPage>
  );
}
