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
  const [wooName, setWooName] = useState("WooCommerce Staging");
  const [wooStoreUrl, setWooStoreUrl] = useState("");
  const [wooSettingsOpened, setWooSettingsOpened] = useState(false);
  const [wooConsumerKey, setWooConsumerKey] = useState("");
  const [wooConsumerSecret, setWooConsumerSecret] = useState("");
  const [wooTestStoreConfirmed, setWooTestStoreConfirmed] = useState(false);
  const [connectingWoo, setConnectingWoo] = useState(false);
  const [wooMessage, setWooMessage] = useState<string | null>(null);
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

  function openWooCommerceApiSettings() {
    try {
      const parsed = new URL(wooStoreUrl.trim());
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname) {
        setError("Enter your staging store's full HTTPS URL before opening WooCommerce settings.");
        return;
      }
      parsed.pathname = "/wp-admin/admin.php";
      parsed.search = new URLSearchParams({ page: "wc-settings", tab: "advanced", section: "keys" }).toString();
      parsed.hash = "";
      window.open(parsed.toString(), "_blank", "noopener,noreferrer");
      setWooSettingsOpened(true);
      setError(null);
    } catch {
      setError("Enter a valid staging store URL, such as https://staging.example.com.");
    }
  }

  async function connectWooCommerce(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWooMessage(null);
    if (!wooTestStoreConfirmed) {
      setError("Confirm that this is a staging/test WooCommerce store before connecting.");
      return;
    }
    setConnectingWoo(true);
    try {
      const response = await fetch("/api/commerce/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wooName.trim(), storeUrl: wooStoreUrl.trim(), consumerKey: wooConsumerKey.trim(), consumerSecret: wooConsumerSecret.trim() }),
      });
      const data = await response.json() as { success?: boolean; error?: string; channel?: CommerceChannel };
      if (!response.ok || !data.success || !data.channel) throw new Error(data.error ?? "Unable to connect WooCommerce store");
      setWooMessage("WooCommerce staging connection verified: " + data.channel.name);
      setWooStoreUrl("");
      setWooSettingsOpened(false);
      setWooConsumerKey("");
      setWooConsumerSecret("");
      setWooTestStoreConfirmed(false);
      await loadChannels();
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Unable to connect WooCommerce store");
    } finally {
      setConnectingWoo(false);
    }
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

        <form onSubmit={connectShopify} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            placeholder="your-store.myshopify.com"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            autoComplete="url"
          />
          <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">
            Connect Shopify
          </button>
        </form>
      </DizitoCard>

      <DizitoCard className="mb-5">
        <h2 className="text-xl font-semibold">Connect WooCommerce</h2>
        <p className="mt-1 text-sm text-gray-600">
          Connect a dedicated staging/test store. WooCommerce REST API keys are created in your store admin, so this guided flow opens the right settings page before you return here to verify the connection.
        </p>

        <form onSubmit={connectWooCommerce} className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Connection name
            <input value={wooName} onChange={(event) => setWooName(event.target.value)} required maxLength={100} className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </label>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-slate-900">Step 1 · Enter your staging store</div>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Staging store URL
              <input value={wooStoreUrl} onChange={(event) => { setWooStoreUrl(event.target.value); setWooSettingsOpened(false); }} type="url" required placeholder="https://staging.example.com" autoComplete="url" className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>
            <p className="text-xs text-slate-500">Use the full HTTPS URL for your test store, not your live production store.</p>
            <div>
              <button type="button" onClick={openWooCommerceApiSettings} disabled={!wooStoreUrl.trim()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Open WooCommerce API settings ↗
              </button>
            </div>
            <p className="text-xs text-slate-500">In the new tab, go to WooCommerce → Settings → Advanced → REST API, select Add key, choose Dizito as the description, and set permissions to Read/Write. Copy the consumer key and secret; WooCommerce may show the secret only once.</p>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:p-4">
            <div className="text-sm font-semibold text-slate-900">Step 2 · Verify and connect</div>
            <p className="text-sm text-slate-600">Paste the API credentials generated for this staging store. Dizito verifies access before saving the connection.</p>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Consumer key
              <input value={wooConsumerKey} onChange={(event) => setWooConsumerKey(event.target.value)} required autoComplete="off" spellCheck={false} placeholder="ck_…" className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Consumer secret
              <input value={wooConsumerSecret} onChange={(event) => setWooConsumerSecret(event.target.value)} type="password" required autoComplete="new-password" spellCheck={false} placeholder="cs_…" className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <input type="checkbox" checked={wooTestStoreConfirmed} onChange={(event) => setWooTestStoreConfirmed(event.target.checked)} className="mt-1" />
            <span>I confirm this is a staging/test store, not production, and it is safe to use for test product creation.</span>
          </label>
          <div>
            <button type="submit" disabled={connectingWoo || !wooTestStoreConfirmed} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              {connectingWoo ? "Verifying connection..." : "Verify & connect WooCommerce"}
            </button>
          </div>
        </form>
        {wooSettingsOpened && <p className="mt-3 text-sm text-slate-600">WooCommerce settings opened in a new tab. After creating your Read/Write key, return here and enter both credentials.</p>}
        {wooMessage && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{wooMessage}</div>}
      </DizitoCard>

      <DizitoCard className="mb-5">
        <h2 className="text-xl font-semibold">Connect Amazon India</h2>
        <p className="text-sm text-gray-600 mt-1">
          Authorize Dizito to access your Amazon Seller Central account through SP-API.
        </p>
        <button
          type="button"
          onClick={connectAmazon}
          className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Connect Amazon India
        </button>
      </DizitoCard>

      {verificationMessage && (
        <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {verificationMessage}
        </div>
      )}

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div>
        <h2 className="text-xl font-semibold mb-4">Connected Commerce Channels</h2>

        {loading && <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500" role="status">Loading commerce channels…</div>}

        {!loading && channels.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">No commerce channels connected yet. Connect WooCommerce, Shopify, or Amazon above to get started.</div>
        )}

        {!loading && channels.map((channel) => {
          const active = channel.status === "active";
          const updating = updatingId === channel.id;
          const verifying = verifyingId === channel.id;
          const amazon = channel.provider === "amazon";

          return (
            <div key={channel.id} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold">{channel.name}</div>
                  <div className="text-sm text-gray-600 capitalize">{channel.provider}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm">{active ? "🟢 Active" : channel.status}</div>
                  {amazon && active && (
                    <button
                      type="button"
                      onClick={() => void verifyAmazon(channel)}
                      disabled={verifying || updating}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {verifying ? "Verifying..." : "Verify"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void setChannelStatus(channel, active ? "inactive" : "active")}
                    disabled={updating || verifying}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {updating ? "Updating..." : active ? "Disconnect" : "Reconnect"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DizitoPage>
  );
}
