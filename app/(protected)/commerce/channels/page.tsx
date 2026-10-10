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
  const [catalogChannelId, setCatalogChannelId] = useState<string | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: number; name: string; sku: string; status: string; price: string; stockStatus: string; image: string; permalink: string }>>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedWooProductIds, setSelectedWooProductIds] = useState<number[]>([]);
  const [productBriefMessage, setProductBriefMessage] = useState<string | null>(null);
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

  async function verifyWooCommerce(channel: CommerceChannel) {
    setVerifyingId(channel.id);
    setVerificationMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/commerce/woocommerce/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id }),
      });
      const data = await response.json() as {
        success?: boolean;
        result?: { storeName?: string; productCount?: number; products?: Array<{ id: number; name: string; sku: string; status: string }> };
        error?: string;
      };
      if (!response.ok || !data.success || !data.result) {
        throw new Error(data.error ?? "WooCommerce verification failed");
      }
      const result = data.result;
      const preview = result.products?.length
        ? " Sample products: " + result.products.map((product) => product.name).join(", ") + "."
        : " No products were returned in the preview.";
      setVerificationMessage(
        `WooCommerce verified successfully${result.storeName ? ` (${result.storeName})` : ""}. Read-only product check retrieved ${result.productCount ?? 0} recent product(s) (up to 5 shown).${preview}`,
      );
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "WooCommerce verification failed");
    } finally {
      setVerifyingId(null);
    }
  }

  async function loadWooCommerceCatalog(channel: CommerceChannel, page = 1) {
    setCatalogLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/commerce/woocommerce/products?channelId=${encodeURIComponent(channel.id)}&page=${page}&perPage=20`);
      const data = await response.json() as { success?: boolean; products?: Array<{ id: number; name: string; sku: string; status: string; price: string; stockStatus: string; image: string; permalink: string }>; hasMore?: boolean; error?: string };
      if (!response.ok || !data.success || !data.products) throw new Error(data.error ?? "Unable to load product catalog");
      setCatalogChannelId(channel.id);
      setCatalogPage(page);
      setCatalogHasMore(Boolean(data.hasMore));
      if (page === 1) { setSelectedWooProductIds([]); setProductBriefMessage(null); }
      setCatalogProducts((current) => page === 1 ? data.products! : [...current, ...data.products!]);
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Unable to load product catalog");
    } finally {
      setCatalogLoading(false);
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

      <div className="mb-5 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-lime-50/60 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Sales channels</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Bring your storefronts into Dizito</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Choose where you sell. Connect a store or marketplace below, then manage your product listings and publishing workflows from one place.</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Connected channels</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-950">{channels.filter((channel) => channel.status === "active").length}<span className="ml-1 text-sm font-medium text-slate-500">active</span></p>
          </div>
        </div>
      </div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><h2 className="text-lg font-bold tracking-tight text-slate-950">Available connections</h2><p className="mt-1 text-sm text-slate-500">Pick a platform to see its setup steps.</p></div>
        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">3 integrations</span>
      </div>
      <div className="mb-5 grid gap-4 md:grid-cols-2">
      <DizitoCard className="group border border-slate-200/80 bg-gradient-to-br from-white to-emerald-50/40 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
        <div className="mb-4 flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-black text-emerald-800">S</div><div className="min-w-0 flex-1"><div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Online store</div><h2 className="text-lg font-bold tracking-tight text-slate-950">Shopify</h2><p className="mt-1 text-xs text-slate-500">Recommended for Shopify storefronts</p></div></div>
        <p className="text-sm text-gray-600 mt-1">
          Connect your Shopify store securely. You’ll be redirected to authorize access.
        </p>

        <form onSubmit={connectShopify} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            placeholder="your-store.myshopify.com"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            autoComplete="url"
          />
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2">
            Connect Shopify
          </button>
        </form>
      </DizitoCard>

      <DizitoCard className="group border border-slate-200/80 bg-gradient-to-br from-white to-amber-50/50 shadow-sm transition hover:border-amber-200 hover:shadow-md">
        <div className="mb-4 flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-lg font-black text-amber-900">a</div><div className="min-w-0 flex-1"><div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">Marketplace</div><h2 className="text-lg font-bold tracking-tight text-slate-950">Amazon India</h2><p className="mt-1 text-xs text-slate-500">Seller Central authorization</p></div></div>
        <p className="text-sm text-gray-600 mt-1">
          Link your seller account through Amazon’s official authorization flow. Product and offer workflows remain separate.
        </p>
        <button
          type="button"
          onClick={connectAmazon}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
        >
          Connect Amazon India
        </button>
      </DizitoCard>

      </div>
      <DizitoCard className="mb-5 border border-slate-200/80 bg-gradient-to-br from-white to-violet-50/40 shadow-sm">
        <div className="mb-3 flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-lg font-black text-violet-800">W</div><div className="min-w-0 flex-1"><div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">WordPress store</div><h2 className="text-lg font-bold tracking-tight text-slate-950">WooCommerce</h2><p className="mt-1 text-xs text-slate-500">Guided setup · test store required</p></div></div>
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

      {catalogChannelId && (
        <DizitoCard className="mb-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">WooCommerce product catalog</h2>
              <p className="mt-1 text-sm text-slate-600">Read-only preview. Loads 20 products per page; no store data is changed.</p>
            </div>
            <span className="text-sm text-slate-500">Page {catalogPage}</span>
          </div>
          {catalogProducts.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedWooProductIds.length} product{selectedWooProductIds.length === 1 ? "" : "s"} selected</p>
                <p className="text-xs text-slate-600">Select catalog items to prepare a product-aware marketing brief. This does not change WooCommerce.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={selectedWooProductIds.length === 0}
                  onClick={() => {
                    const selected = catalogProducts.filter((product) => selectedWooProductIds.includes(product.id));
                    const brief = selected.map((product) => [
                      product.name,
                      product.price ? `Price: ${product.price}` : "",
                      product.sku ? `SKU: ${product.sku}` : "",
                      product.stockStatus ? `Stock: ${product.stockStatus}` : "",
                      product.permalink ? `Product URL: ${product.permalink}` : "",
                    ].filter(Boolean).join("\\n")).join("\\n\\n");
                    void navigator.clipboard.writeText(brief).then(() => setProductBriefMessage("Product brief copied. Paste it into your marketing content or weekly plan.")).catch(() => setProductBriefMessage("Clipboard access was blocked. Select products and copy their details manually."));
                  }}
                  className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy product brief
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selected = catalogProducts.filter((product) => selectedWooProductIds.includes(product.id));
                    try {
                      sessionStorage.setItem("dizito-woocommerce-product-handoff", JSON.stringify(selected.map(({ id, name, sku, price, stockStatus, permalink }) => ({ id, name, sku, price, stockStatus, permalink }))));
                      window.location.href = "/generate-my-week";
                    } catch {
                      setProductBriefMessage("Unable to hand off selected products in this browser. Use Copy product brief instead.");
                    }
                  }}
                  disabled={selectedWooProductIds.length === 0}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >Use in weekly plan</button>
              </div>
            </div>
          )}
          {productBriefMessage && <p role="status" className="mt-2 text-sm text-violet-800">{productBriefMessage}</p>}
          {catalogProducts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No products were returned.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {catalogProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${product.name}`}
                    checked={selectedWooProductIds.includes(product.id)}
                    onChange={(event) => setSelectedWooProductIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))}
                    className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-600"
                  />
                  {product.image ? <img src={product.image} alt="" className="h-12 w-12 rounded-lg border border-slate-200 object-cover" loading="lazy" /> : <div className="h-12 w-12 rounded-lg bg-slate-100" aria-hidden="true" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">ID {product.id}{product.sku ? ` · SKU ${product.sku}` : ""} · {product.stockStatus}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{product.price || "Price not set"}</p>
                    <p className="text-xs text-slate-500">{product.status}</p>
                  </div>
                  {product.permalink && <a href={product.permalink} target="_blank" rel="noreferrer" className="text-xs font-medium text-violet-700 underline">View</a>}
                </div>
              ))}
            </div>
          )}
          {catalogHasMore && (
            <button type="button" onClick={() => { const channel = channels.find((item) => item.id === catalogChannelId); if (channel) void loadWooCommerceCatalog(channel, catalogPage + 1); }} disabled={catalogLoading} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {catalogLoading ? "Loading..." : "Load next 20"}
            </button>
          )}
        </DizitoCard>
      )}
      {verificationMessage && (
        <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {verificationMessage}
        </div>
      )}

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section aria-labelledby="connected-commerce-heading" className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Your setup</p>
            <h2 id="connected-commerce-heading" className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Connected commerce channels</h2>
            <p className="mt-1 text-sm text-slate-500">Manage existing connections and run available access checks.</p>
          </div>
          {!loading && channels.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">{channels.filter((channel) => channel.status === "active").length} active</span>
              {channels.some((channel) => channel.status !== "active") && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">{channels.filter((channel) => channel.status !== "active").length} need attention</span>}
            </div>
          )}
        </div>

        {loading && <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500" role="status">Loading your commerce connections…</div>}

        {!loading && channels.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm" aria-hidden="true">↗</div>
            <h3 className="mt-3 text-base font-bold text-slate-900">Your commerce channels will appear here</h3>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">Choose Shopify, Amazon India or WooCommerce above to get started. Once linked, you’ll see its connection status and the available management actions here.</p>
          </div>
        )}

        {!loading && channels.length > 0 && (
          <div className="grid gap-3">
            {channels.map((channel) => {
              const active = channel.status === "active";
              const updating = updatingId === channel.id;
              const verifying = verifyingId === channel.id;
              const amazon = channel.provider === "amazon";
              const woocommerce = channel.provider === "woocommerce";
              const providerName = amazon ? "Amazon India" : woocommerce ? "WooCommerce" : channel.provider === "shopify" ? "Shopify" : channel.provider;
              const providerStyle = amazon ? "bg-amber-100 text-amber-900" : woocommerce ? "bg-violet-100 text-violet-900" : channel.provider === "shopify" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-800";

              return (
                <article key={channel.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-extrabold ${providerStyle}`} aria-hidden="true">{amazon ? "a" : woocommerce ? "W" : channel.provider === "shopify" ? "S" : providerName.slice(0, 1).toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-base font-bold text-slate-950">{channel.name}</h3>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
                            {active ? "Connection enabled" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{providerName}{channel.external_account_id ? ` · Account ID ${channel.external_account_id}` : ""}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{active ? "Dizito has this channel saved as active. Use the access check to confirm provider access where available." : "This connection is currently inactive. Re-enable it only if you want to use it again."}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[620px] xl:justify-end">
                      {woocommerce && active && (
                        <button type="button" onClick={() => void verifyWooCommerce(channel)} disabled={verifying || updating} className="rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50">
                          {verifying ? "Checking access…" : "Check store access"}
                        </button>
                      )}
                      {woocommerce && active && (
                        <button type="button" onClick={() => void loadWooCommerceCatalog(channel, 1)} disabled={catalogLoading || updating} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                          {catalogLoading && catalogChannelId === channel.id ? "Loading…" : "View product catalog"}
                        </button>
                      )}
                      {amazon && active && (
                        <button type="button" onClick={() => void verifyAmazon(channel)} disabled={verifying || updating} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
                          {verifying ? "Checking access…" : "Check seller access"}
                        </button>
                      )}
                      <button type="button" onClick={() => void setChannelStatus(channel, active ? "inactive" : "active")} disabled={updating || verifying} className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-violet-700 text-white hover:bg-violet-800"}`}>
                        {updating ? "Updating…" : active ? "Disconnect" : "Enable connection"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </DizitoPage>
  );
}
