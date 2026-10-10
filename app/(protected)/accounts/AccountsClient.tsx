"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Link2, RefreshCw, ShieldAlert, Unplug } from "lucide-react";
import {
  DizitoBadge,
  DizitoButton,
  DizitoCard,
  DizitoPage,
  DizitoPageHeader,
  DizitoState,
} from "@/components/dizito/DizitoUI";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState({ used: 0, allowed: 1 });

  async function loadAccounts() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load connected accounts");
      if (
        !data ||
        !Array.isArray(data.accounts) ||
        !data.user ||
        typeof data.user.plan !== "string" ||
        !data.limits ||
        typeof data.limits.used !== "number" ||
        typeof data.limits.allowed !== "number"
      ) {
        throw new Error("Unexpected accounts response. Please try again.");
      }
      setAccounts(data.accounts);
      setPlan(data.user.plan);
      setLimits(data.limits);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load connected accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  if (loading) {
    return (
      <DizitoPage>
        <DizitoPageHeader
          eyebrow="Distribution"
          title="Channels & accounts"
          description="Connect the destinations where approved Dizito content will reach customers."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((item) => (
            <DizitoCard key={item}>
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-3 w-48 animate-pulse rounded bg-gray-100" />
              <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-gray-100" />
            </DizitoCard>
          ))}
        </div>
      </DizitoPage>
    );
  }


  if (error && !loading) {
    return (
      <DizitoPage>
        <DizitoPageHeader
          eyebrow="Distribution"
          title="Channels & accounts"
          description="Connect the destinations where approved Dizito content will reach customers."
        />
        <DizitoState
          kind="error"
          title="Accounts could not load"
          description={error}
          action={<DizitoButton variant="secondary" onClick={() => void loadAccounts()}>Try again</DizitoButton>}
        />
      </DizitoPage>
    );
  }
  const accountLimitReached = limits.used >= limits.allowed;
  const connect = (url: string) => {
    if (!accountLimitReached) window.location.assign(url);
  };

  async function refreshHealth() {
    setRefreshing(true);
    try {
      const healthResponse = await fetch("/api/accounts/health-check", { cache: "no-store" });
      if (!healthResponse.ok) throw new Error("Unable to refresh account status");

      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load accounts");

      const data = await response.json();
      if (
        !data ||
        !Array.isArray(data.accounts) ||
        !data.user ||
        typeof data.user.plan !== "string" ||
        !data.limits ||
        typeof data.limits.used !== "number" ||
        typeof data.limits.allowed !== "number"
      ) {
        throw new Error("Unexpected accounts response");
      }
      setAccounts(data.accounts);
      setPlan(data.user.plan);
      setLimits(data.limits);
    } catch (error) {
      console.error("Account status refresh failed", error);
      alert("Unable to refresh account status. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }

  function getReconnectUrl(account: any) {
    switch (account.platform.toLowerCase()) {
      case "linkedin":
        return `/api/linkedin/login?reconnect=${account.id}`;
      case "pinterest":
        return `/api/pinterest/login?reconnect=${account.id}`;
      case "google-business":
      case "google_business":
        return `/api/google-business/login?reconnect=${account.id}`;
      case "facebook":
      case "instagram":
        return `/api/meta/connect?reconnect=${account.id}&type=account`;
      default:
        return "#";
    }
  }

  async function disconnect(account: any) {
    const confirmed = confirm("Disconnect this account?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        alert(`${data.error || "Unable to disconnect account"}${data.scheduledPosts ? ` (${data.scheduledPosts} scheduled posts)` : ""}`);
        return;
      }

      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setLimits((current) => ({ ...current, used: Math.max(0, current.used - 1) }));
      alert("Account disconnected");
    } catch {
      alert("Unable to disconnect account. Please check your connection and try again.");
    }
  }

  return (
    <DizitoPage>
      <DizitoPageHeader
        eyebrow="Distribution"
        title="Channels & accounts"
        description="Connect the destinations where approved Dizito content will reach customers."
        action={
          <DizitoButton variant="secondary" onClick={refreshHealth} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Checking…" : "Refresh status"}
          </DizitoButton>
        }
      />

      <DizitoCard className="mb-5" tone="soft">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Current plan</div>
            <div className="mt-1 text-2xl font-extrabold capitalize tracking-tight">{plan}</div>
            <p className="mt-1 text-sm text-gray-500">
              {limits.used} of {limits.allowed} account slot{limits.allowed === 1 ? "" : "s"} in use.
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200" aria-label="Account capacity">
            <div
              className="h-full rounded-full bg-[var(--dizito-violet)] transition-all"
              style={{ width: `${Math.min(100, (limits.used / Math.max(1, limits.allowed)) * 100)}%` }}
            />
          </div>

          <div>
            <div className="mb-3">
              <h2 className="text-base font-bold tracking-tight text-slate-950">Connect a social channel</h2>
              <p className="mt-1 text-sm text-gray-500">Choose where you want to publish. You’ll sign in with that platform to authorize Dizito.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Meta", detail: "Instagram & Facebook", url: "/api/meta/connect", logo: "meta", style: "border-blue-200 bg-blue-50 text-blue-800", iconStyle: "bg-blue-100 text-blue-800" },
                { label: "LinkedIn", detail: "Professional network", url: "/api/linkedin/login", logo: "linkedin", style: "border-sky-200 bg-sky-50 text-sky-800", iconStyle: "bg-sky-100 text-sky-800" },
                { label: "Pinterest", detail: "Visual discovery", url: "/api/pinterest/login", logo: "pinterest", style: "border-rose-200 bg-rose-50 text-rose-800", iconStyle: "bg-rose-100 text-rose-800" },
                { label: "Google Business", detail: "Local business profile", url: "/api/google-business/login", logo: "google", style: "border-amber-200 bg-amber-50 text-amber-900", iconStyle: "bg-amber-100 text-amber-900" },
              ].map((provider) => (
                <button
                  key={provider.label}
                  type="button"
                  disabled={accountLimitReached}
                  onClick={() => connect(provider.url)}
                  className={`group flex min-h-[126px] w-full flex-col rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${provider.style}`}
                  aria-label={`Connect ${provider.label}: ${provider.detail}`}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${provider.iconStyle}`} aria-hidden="true">
                      {provider.logo === "meta" ? <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none"><path d="M4 21.5C5.7 13.8 9.1 7 12.5 7c4.1 0 7.2 17.8 10.9 17.8 2.5 0 4.5-5.5 4.5-10.2 0-4.4-1.5-7.6-4.3-7.6-4.5 0-10 17-14.4 17C6.5 24 4 21.5 4 17.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg> : provider.logo === "linkedin" ? <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor"><path d="M7 11h4v14H7zM9 5.5a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6ZM14 11h3.8v1.9h.1c.5-1 1.8-2.3 4-2.3 4.2 0 5.1 2.7 5.1 6.2V25h-4v-7.3c0-1.8 0-4-2.5-4s-2.8 1.9-2.8 3.9V25h-4V11Z"/></svg> : provider.logo === "pinterest" ? <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor"><path d="M16 3.5A12.5 12.5 0 0 0 11.4 27c-.1-1.1 0-2.4.3-3.6l1.7-7.1s-.4-.8-.4-2c0-1.9 1.1-3.3 2.5-3.3 1.2 0 1.8.9 1.8 2 0 1.2-.8 3.1-1.2 4.9-.4 1.5.8 2.7 2.2 2.7 2.7 0 4.5-3.5 4.5-7.6 0-3.1-2.1-5.4-5.9-5.4-4.3 0-7 3.2-7 6.8 0 1.2.4 2.5 1 3.2.3.4.4.5.3.9l-.4 1.4c-.1.4-.4.5-.8.3-2.1-.9-3.1-3.3-3.1-6 0-4.4 3.7-9.7 11-9.7 5.9 0 9.8 4.3 9.8 8.9 0 6.1-3.4 10.7-8.5 10.7-1.7 0-3.3-.9-3.9-1.9l-1.1 4.3c-.4 1.3-1 2.6-1.6 3.6A12.5 12.5 0 1 0 16 3.5Z"/></svg> : <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none"><path d="M27 16.3c0-.9-.1-1.8-.3-2.7H16v5.1h6.2a5.3 5.3 0 0 1-2.3 3.5v3.3h3.8c2.2-2 3.3-5.1 3.3-9.2Z" fill="#4285F4"/><path d="M16 27.4c3.1 0 5.7-1 7.6-2.9l-3.8-3.3c-1 .7-2.2 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.7H5.8v3.4a11.5 11.5 0 0 0 10.2 6.4Z" fill="#34A853"/><path d="M9.7 17.6a6.9 6.9 0 0 1 0-4.4V9.8H5.8a11.5 11.5 0 0 0 0 11.2l3.9-3.4Z" fill="#FBBC05"/><path d="M16 8.5c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11 11 0 0 0 16 3.6 11.5 11.5 0 0 0 5.8 9.8l3.9 3.4c.9-2.7 3.4-4.7 6.3-4.7Z" fill="#EA4335"/></svg>}
                    </span>
                    <span className="text-xs font-semibold opacity-70">Connect <span aria-hidden="true">↗</span></span>
                  </span>
                  <span className="mt-4 text-sm font-extrabold">{provider.label}</span>
                  <span className="mt-1 text-xs leading-5 opacity-80">{provider.detail}</span>
                </button>
              ))}
            </div>
          </div>

          {accountLimitReached && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold text-amber-900">
                  <ShieldAlert size={16} />
                  Account limit reached
                </div>
                <p className="mt-1 text-sm text-amber-800">Upgrade to connect another distribution account.</p>
              </div>
              <a href="/pricing" className="text-sm font-bold text-amber-900 underline underline-offset-4">
                View plans
              </a>
            </div>
          )}
        </div>
      </DizitoCard>

      <section aria-labelledby="connected-social-heading" className="mt-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Your setup</p>
            <h2 id="connected-social-heading" className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Connected social accounts</h2>
            <p className="mt-1 text-sm text-gray-500">Check authorization health and manage the accounts available for publishing.</p>
          </div>
          {accounts.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">{accounts.filter((account) => account.status === "connected").length} connected</span>
              {accounts.some((account) => account.status !== "connected") && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900">{accounts.filter((account) => account.status !== "connected").length} need attention</span>}
            </div>
          )}
        </div>
      {accounts.length === 0 ? (
        <DizitoState
          kind="empty"
          title="No accounts connected yet"
          description="Connect a channel above to make approved content ready for distribution."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => {
            const status = account.status === "connected"
              ? "success"
              : account.status === "expired"
                ? "danger"
                : "warning";

            return (
              <DizitoCard key={account.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-extrabold">{account.account_name}</h2>
                      <DizitoBadge tone={status}>
                        {account.status === "connected" ? "Connected" : account.status === "expired" ? "Expired" : "Needs attention"}
                      </DizitoBadge>
                    </div>
                    <p className="mt-1 text-sm capitalize text-gray-500">{account.platform}</p>
                  </div>
                  {account.status === "connected" && <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />}
                </div>

                {account.status !== "connected" && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-900">
                      {account.status === "expired"
                        ? "The connection has expired and needs to be reconnected."
                        : "This connection needs attention before it can be used reliably."}
                    </p>
                    <DizitoButton className="mt-3" onClick={() => { window.location.href = getReconnectUrl(account); }}>
                      <Link2 size={15} />
                      Reconnect
                    </DizitoButton>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-gray-500">
                    Last checked:{" "}
                    <span className="font-medium text-gray-700">
                      {account.last_checked_at ? new Date(account.last_checked_at).toLocaleString() : "Never"}
                    </span>
                  </div>
                  <DizitoButton variant="danger" onClick={() => disconnect(account)}>
                    <Unplug size={15} />
                    Disconnect
                  </DizitoButton>
                </div>
              </DizitoCard>
            );
          })}
        </div>
      )}
      </section>
    </DizitoPage>
  );
}
