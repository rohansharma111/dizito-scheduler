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
  const [limits, setLimits] = useState({ used: 0, allowed: 1 });

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts);
        setPlan(data.user.plan);
        setLimits(data.limits);
      })
      .finally(() => setLoading(false));
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

  const accountLimitReached = limits.used >= limits.allowed;
  const connect = (url: string) => {
    if (!accountLimitReached) window.location.href = url;
  };

  async function refreshHealth() {
    setRefreshing(true);
    try {
      const healthResponse = await fetch("/api/accounts/health-check", { cache: "no-store" });
      if (!healthResponse.ok) throw new Error("Unable to refresh account status");

      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load accounts");

      const data = await response.json();
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

    const response = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      alert(`${data.error}${data.scheduledPosts ? ` (${data.scheduledPosts} scheduled posts)` : ""}`);
      return;
    }

    setAccounts((current) => current.filter((item) => item.id !== account.id));
    setLimits((current) => ({ ...current, used: Math.max(0, current.used - 1) }));
    alert("Account disconnected");
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Meta", "/api/meta/connect"],
              ["LinkedIn", "/api/linkedin/login"],
              ["Pinterest", "/api/pinterest/login"],
              ["Google Business", "/api/google-business/login"],
            ].map(([label, url]) => (
              <DizitoButton key={label} variant="secondary" disabled={accountLimitReached} onClick={() => connect(url)}>
                <Link2 size={15} />
                Connect {label}
              </DizitoButton>
            ))}
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
    </DizitoPage>
  );
}
