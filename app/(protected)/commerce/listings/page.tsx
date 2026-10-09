"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw, Store } from "lucide-react";
import Link from "next/link";
import { DizitoBadge, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

interface CommerceListing {
  id: string;
  channel_id: string;
  product_id: string;
  status: string;
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
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function statusTone(value: string): "success" | "warning" | "danger" | "neutral" {
  const normalized = value.toLowerCase();
  if (["published", "synced", "active", "success", "completed"].includes(normalized)) return "success";
  if (["pending", "queued", "syncing", "draft"].includes(normalized)) return "warning";
  if (["failed", "error", "rejected"].includes(normalized)) return "danger";
  return "neutral";
}

export default function CommerceListingsPage() {
  const [listings, setListings] = useState<CommerceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <DizitoPage className="px-4 sm:px-6">
      <DizitoPageHeader eyebrow="Commerce" title="Commerce listings" description="Review channel-specific listings created from your canonical Dizito catalog." action={<Link href="/commerce/channels" className="dizito-button dizito-button-secondary"><Store size={16} /> Manage channels <ArrowUpRight size={15} /></Link>} />

      {loading && <DizitoState kind="empty" title="Loading commerce listings" description="Retrieving the latest listing and sync status from your workspace." />}
      {error && <DizitoState kind="error" title="Listings could not be loaded" description={error} />}
      {!loading && !error && listings.length === 0 && <DizitoState kind="empty" title="No commerce listings yet" description="Listings appear here after products are prepared for a connected commerce channel." action={<Link href="/products" className="dizito-button dizito-button-primary">View products</Link>} />}

      {!loading && !error && listings.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {listings.map((listing) => (
            <DizitoCard key={listing.id}>
              <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-extrabold tracking-tight text-slate-900">{listing.product_name}</h2>
                  <p className="mt-1 break-words text-sm text-slate-500">{listing.provider} <span aria-hidden="true">·</span> {listing.channel_name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DizitoBadge tone={statusTone(listing.status)}>{listing.status}</DizitoBadge>
                  <DizitoBadge tone={statusTone(listing.sync_status)}>{listing.sync_status}</DizitoBadge>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Listing ID</p><p className="mt-1 break-all font-mono text-slate-700">{listing.id}</p></div>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">External ID</p><p className="mt-1 break-all font-mono text-slate-700">{listing.external_id ?? "Not published"}</p></div>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last synced</p><p className="mt-1 text-slate-700">{formatDate(listing.last_synced_at)}</p></div>
              </div>
              {listing.last_error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"><span className="font-bold">Last sync error: </span>{listing.last_error}</div>}
            </DizitoCard>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500"><RefreshCw size={14} className="mt-0.5 shrink-0" /> Listing status reflects stored application/provider workflow state; it does not by itself certify that a provider integration is production-ready.</div>
    </DizitoPage>
  );
}
