"use client";

import { useEffect, useState } from "react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limits, setLimits] = useState({
    used: 0,
    allowed: 1,
  });

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts);
        setPlan(data.user.plan);
        setLimits(data.limits);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const accountLimitReached = limits.used >= limits.allowed;

  const connectInstagram = () => {
    if (accountLimitReached) return;

    window.location.href = "/api/meta/connect";
  };

  const connectLinkedIn = () => {
    if (accountLimitReached) return;

    window.location.href = "/api/linkedin/login";
  };

  const connectPinterest = () => {
    if (accountLimitReached) return;

    window.location.href = "/api/pinterest/login";
  };

  const connectGoogleBusiness = () => {
    if (accountLimitReached) return;

    window.location.href = "/api/google-business/login";
  };

  async function refreshHealth() {
    setRefreshing(true);

    try {
      const healthResponse = await fetch("/api/accounts/health-check", {
        cache: "no-store",
      });

      if (!healthResponse.ok) {
        throw new Error("Unable to refresh account status");
      }

      const response = await fetch("/api/accounts", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load accounts");
      }

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

  return (
    <div className="p-8">
      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div><div className="dizito-eyebrow"><Link2 size={13}/>Distribution</div><h1 className="dizito-title">Channels & accounts</h1><p className="dizito-subtitle">Connect the destinations where approved Dizito content will reach customers.</p></div>

        <button
          onClick={refreshHealth}
          disabled={refreshing}
          className="
      bg-gray-800
      text-white
      px-4
      py-2
      rounded
    "
        >
          {refreshing ? "Checking..." : "Refresh Status"}
        </button>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            disabled={accountLimitReached}
            onClick={connectInstagram}
            className={`px-4 py-2 rounded text-white ${
              accountLimitReached
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600"
            }`}
          >
            Connect Meta
          </button>

          <button
            disabled={accountLimitReached}
            onClick={connectLinkedIn}
            className={`px-4 py-2 rounded text-white ${
              accountLimitReached
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600"
            }`}
          >
            Connect LinkedIn
          </button>

          <button
            disabled={accountLimitReached}
            onClick={connectPinterest}
            className={`px-4 py-2 rounded text-white ${
              accountLimitReached
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600"
            }`}
          >
            Connect Pinterest
          </button>

          <button
            disabled={accountLimitReached}
            onClick={connectGoogleBusiness}
            className={`px-4 py-2 rounded text-white ${
              accountLimitReached
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600"
            }`}
          >
            Connect Google Business
          </button>
        </div>
      </div>

      {/* PLAN CARD */}

      <div className="dizito-card mb-5">
        <div className="text-sm text-gray-500">Current Plan</div>

        <div className="text-2xl font-bold mt-1 capitalize">{plan}</div>

        <div className="mt-3">
          Accounts Used:
          <span className="font-semibold ml-2">
            {limits.used}/{limits.allowed}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded h-2 mt-3">
          <div
            className="bg-blue-600 h-2 rounded"
            style={{
              width: `${Math.min(100, (limits.used / limits.allowed) * 100)}%`,
            }}
          />
        </div>

        {accountLimitReached && (
          <div className="mt-4 p-3 rounded bg-yellow-50 border border-yellow-300">
            <div className="font-medium">
              You've reached your account limit.
            </div>

            <a href="/pricing" className="text-blue-600 mt-2 inline-block">
              Upgrade your plan →
            </a>
          </div>
        )}
      </div>

      {/* EMPTY */}

      {accounts.length === 0 && (
        <div className="dizito-state">
          No accounts connected yet.
        </div>
      )}

      {/* ACCOUNTS */}

      {accounts.map((account) => (
        <div key={account.id} className="dizito-card !p-4 mb-4">
          <div className="font-bold text-lg">{account.account_name}</div>

          <div className="text-gray-600 capitalize">{account.platform}</div>

          <div className="mt-2">
            {account.status === "connected" && <div>🟢 Connected</div>}

            {account.status === "expired" && (
              <div className="flex items-center gap-2">
                🔴 Expired
                <button
                  className="
        bg-blue-600
        text-white
        px-3
        py-1
        rounded
      "
                  onClick={() => {
                    window.location.href = getReconnectUrl(account);
                  }}
                >
                  Reconnect
                </button>
              </div>
            )}

            {account.status === "error" && (
              <div className="flex items-center gap-2">
                🟠 Error
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={() => {
                    window.location.href = getReconnectUrl(account);
                  }}
                >
                  Reconnect
                </button>
              </div>
            )}
          </div>

          <div className="text-sm mt-2">
            Last Checked:{" "}
            {account.last_checked_at
              ? new Date(account.last_checked_at).toLocaleString()
              : "Never"}
          </div>

          <button
            className="mt-3 bg-red-500 text-white px-3 py-1 rounded"
            onClick={async () => {
              const confirmed = confirm("Disconnect this account?");

              if (!confirmed) return;

              const response = await fetch(`/api/accounts/${account.id}`, {
                method: "DELETE",
              });

              const data = await response.json();

              if (!response.ok) {
                alert(
                  `${data.error}${
                    data.scheduledPosts
                      ? ` (${data.scheduledPosts} scheduled posts)`
                      : ""
                  }`,
                );

                return;
              }

              setAccounts(accounts.filter((a) => a.id !== account.id));

              setLimits({
                ...limits,
                used: limits.used - 1,
              });

              alert("Account disconnected");
            }}
          >
            Disconnect
          </button>
        </div>
      ))}
    </div>
  );
}
