"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, ShoppingBag } from "lucide-react";
import { DizitoBadge, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

type Order = {
  id: number; order_number: string; source: string; customer_name: string | null;
  customer_email: string | null; currency: string; total: string | number;
  payment_status: string; order_status: string; fulfillment_status: string;
  created_at: string; item_quantity: string | number; item_count: string | number;
};

function statusTone(value: string): "success" | "warning" | "danger" | "neutral" {
  const status = value.toLowerCase();
  if (["paid", "completed", "fulfilled", "delivered", "success"].includes(status)) return "success";
  if (["pending", "processing", "unfulfilled", "partially_fulfilled"].includes(status)) return "warning";
  if (["failed", "cancelled", "refunded", "rejected"].includes(status)) return "danger";
  return "neutral";
}

function formatMoney(value: string | number, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency || "INR"} ${amount.toFixed(2)}`;
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const response = await fetch(`/api/orders?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load orders");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load orders");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  return (
    <DizitoPage className="px-4 sm:px-6">
      <DizitoPageHeader eyebrow="Commerce" title="Orders" description="Review customer orders, payment state, and fulfillment progress." action={<Link href="/commerce/channels" className="dizito-button dizito-button-secondary">Commerce channels</Link>} />
      <DizitoCard>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search orders</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order number or customer…" className="dizito-input w-full pl-9" />
          </label>
          <label className="sm:w-56">
            <span className="sr-only">Filter by order status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="dizito-input w-full">
              <option value="">All order statuses</option>
              {["pending", "processing", "completed", "cancelled", "refunded"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void loadOrders()} disabled={loading} className="dizito-button dizito-button-secondary disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>
      </DizitoCard>

      {loading && <DizitoState kind="empty" title="Loading orders" description="Retrieving orders for your workspace." />}
      {error && <DizitoState kind="error" title="Orders could not be loaded" description={error} action={<button type="button" onClick={() => void loadOrders()} className="dizito-button dizito-button-secondary">Try again</button>} />}
      {!loading && !error && orders.length === 0 && <DizitoState kind="empty" title={search || status ? "No matching orders" : "No orders yet"} description={search || status ? "Try changing the search or status filter." : "Orders will appear here when imported from a connected channel or created in Dizito."} action={<Link href="/commerce/channels" className="dizito-button dizito-button-primary"><ShoppingBag size={15} /> View commerce channels</Link>} />}

      {!loading && !error && orders.length > 0 && <DizitoCard>
        <p className="mb-3 text-sm text-slate-500">{orders.length} {orders.length === 1 ? "order" : "orders"} shown · latest first</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3 font-semibold">Order</th><th className="px-3 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Items</th><th className="px-3 py-3 font-semibold">Total</th><th className="px-3 py-3 font-semibold">Payment</th><th className="px-3 py-3 font-semibold">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{orders.map((order) => <tr key={order.id} className="align-top hover:bg-slate-50/70">
              <td className="px-3 py-4"><div className="font-bold text-slate-900">{order.order_number}</div><div className="mt-1 text-xs text-slate-500">{order.source || "manual"}</div></td>
              <td className="px-3 py-4"><div className="font-medium text-slate-800">{order.customer_name || "Guest customer"}</div><div className="mt-1 text-xs text-slate-500">{order.customer_email || "No email"}</div></td>
              <td className="whitespace-nowrap px-3 py-4 text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
              <td className="px-3 py-4 text-slate-600">{Number(order.item_count)} lines · {Number(order.item_quantity)} units</td>
              <td className="whitespace-nowrap px-3 py-4 font-semibold text-slate-900">{formatMoney(order.total, order.currency)}</td>
              <td className="px-3 py-4"><DizitoBadge tone={statusTone(order.payment_status)}>{order.payment_status.replaceAll("_", " ")}</DizitoBadge></td>
              <td className="px-3 py-4"><DizitoBadge tone={statusTone(order.order_status)}>{order.order_status.replaceAll("_", " ")}</DizitoBadge><div className="mt-2 text-xs text-slate-500">{order.fulfillment_status.replaceAll("_", " ")}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </DizitoCard>}
    </DizitoPage>
  );
}
