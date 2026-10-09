"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, ShoppingBag } from "lucide-react";
import { DizitoCard, DizitoSectionHeader } from "@/components/dizito/DizitoUI";

interface Channel {
  id: string;
  provider: string;
  name: string;
  status: string;
}
interface WooProduct {
  id: number;
  name: string;
  sku: string;
  status: string;
  type: string;
  price: string;
  currency: string;
  stockStatus: string;
  permalink: string;
  image: string;
}
interface Props { productId: string; }

export default function ProductWooCommerceCatalog({ productId }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/commerce/channels");
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.error || "Unable to load commerce channels");
        const connected = (data.channels ?? []).filter((item: Channel) => item.provider === "woocommerce");
        if (cancelled) return;
        setChannels(connected);
        const active = connected.find((item: Channel) => item.status === "active") ?? connected[0];
        if (active) setChannelId(active.id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load commerce channels");
      } finally {
        if (!cancelled) setLoadingChannels(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function loadProducts(nextPage = 1) {
    if (!channelId) return;
    setLoadingProducts(true);
    setError(null);
    try {
      const response = await fetch(`/api/commerce/woocommerce/products?channelId=${encodeURIComponent(channelId)}&page=${nextPage}&perPage=20`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to read WooCommerce products");
      setProducts(data.products ?? []);
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read WooCommerce products");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    if (channelId) void loadProducts(1);
    else setProducts([]);
    // loadProducts is intentionally driven by the selected channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((item) => item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term) || String(item.id).includes(term));
  }, [products, search]);

  return (
    <DizitoCard>
      <DizitoSectionHeader
        title="WooCommerce"
        description="Browse products from your connected store alongside this canonical product. This view is read-only; it does not change your WooCommerce store."
        action={<ShoppingBag size={18} className="text-violet-600" />}
      />
      {loadingChannels ? <p className="text-sm text-slate-500">Loading WooCommerce connections…</p> : channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800">No WooCommerce store connected</p>
          <p className="mt-1 text-sm text-slate-500">Connect your store in Commerce → Channels to browse its catalog here.</p>
          <a href="/commerce/channels" className="mt-3 inline-flex text-sm font-semibold text-violet-700 hover:text-violet-900">Open Commerce Channels</a>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
              Connected store
              <select value={channelId} onChange={(event) => setChannelId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}{channel.status !== "active" ? ` · ${channel.status}` : ""}</option>)}
              </select>
            </label>
            <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
              Find a store product
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU or ID" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <button type="button" onClick={() => void loadProducts(page)} disabled={!channelId || loadingProducts} className="inline-flex items-center justify-center gap-2 self-end rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={15} className={loadingProducts ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {loadingProducts ? <p className="py-5 text-center text-sm text-slate-500">Reading store catalog…</p> : products.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No products returned. Check the connection or refresh to try again.</p>
          ) : visibleProducts.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No products match that search on this page. Use pagination to browse more store products.</p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {visibleProducts.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 sm:p-4">
                  {item.image ? <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400"><ShoppingBag size={20} /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">ID {item.id}{item.sku ? ` · SKU ${item.sku}` : ""} · {item.type} · {item.status}</p>
                    <p className="mt-1 text-xs text-slate-600">{item.price ? `${item.currency ? item.currency + " " : ""}${item.price}` : "Price not provided"} · Stock: {item.stockStatus || "unknown"}</p>
                  </div>
                  {item.permalink && /^https?:\/\//i.test(item.permalink) && <a href={item.permalink} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900">View <ExternalLink size={13} /></a>}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">Page {page} · 20 products per page</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void loadProducts(page - 1)} disabled={page <= 1 || loadingProducts} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40">Previous</button>
              <button type="button" onClick={() => void loadProducts(page + 1)} disabled={!hasMore || loadingProducts} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40">Next</button>
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">This catalog browser does not link, publish, or edit products. A persistent canonical-to-WooCommerce mapping needs a separate explicit workflow; no store changes are made here.</p>
        </div>
      )}
    </DizitoCard>
  );
}
