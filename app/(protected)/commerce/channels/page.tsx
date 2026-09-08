"use client";

import { FormEvent, useEffect, useState } from "react";

interface CommerceChannel {
  id: string;
  provider: string;
  name: string;
  status: string;
  external_account_id: string | null;
  created_at: string;
}

export default function CommerceChannelsPage() {
  const [shop, setShop] = useState("");
  const [channels, setChannels] = useState<CommerceChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/commerce/channels")
      .then((response) => response.json())
      .then((data) => setChannels(data.channels ?? []))
      .finally(() => setLoading(false));
  }, []);

  function connectShopify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = shop.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!normalized) return;

    window.location.href = `/api/commerce/shopify/connect?shop=${encodeURIComponent(normalized)}`;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Commerce Channels</h1>
        <p className="text-gray-600 mt-2">
          Connect a sales channel without changing the canonical Dizito product catalog.
        </p>
      </div>

      <div className="border rounded-lg p-6 mb-8">
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

      <div>
        <h2 className="text-xl font-semibold mb-4">Connected Commerce Channels</h2>

        {loading && <div className="text-gray-600">Loading...</div>}

        {!loading && channels.length === 0 && (
          <div className="border rounded p-6 text-gray-600">No commerce channels connected yet.</div>
        )}

        {!loading && channels.map((channel) => (
          <div key={channel.id} className="border rounded p-4 mb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{channel.name}</div>
                <div className="text-sm text-gray-600 capitalize">{channel.provider}</div>
              </div>
              <div className="text-sm">{channel.status === "active" ? "🟢 Active" : channel.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
