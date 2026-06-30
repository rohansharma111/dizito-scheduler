"use client";

import { useEffect, useState } from "react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plan, setPlan] = useState("free");
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
      });
  }, []);

  const accountLimitReached = limits.used >= limits.allowed;

  const connectInstagram = () => {
    if (accountLimitReached) return;

    window.location.href = "/api/meta/connect";
  };

  const connectLinkedIn = () => {
    if (accountLimitReached) return;

    window.location.href = "/api/linkedin/login";
  };

  return (
    <div className="p-8">
      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Connected Accounts</h1>

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
        </div>
      </div>

      {/* PLAN CARD */}

      <div className="border rounded-lg p-6 mb-6 bg-white">
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
        <div className="border rounded p-6 text-center">
          No accounts connected yet.
        </div>
      )}

      {/* ACCOUNTS */}

      {accounts.map((account) => (
        <div key={account.id} className="border p-4 rounded mb-4">
          <div className="font-bold text-lg">{account.account_name}</div>

          <div className="text-gray-600 capitalize">{account.platform}</div>

          <div className="mt-2">
            {account.status === "connected" && <div>🟢 Connected</div>}

            {account.status === "expired" && (
              <div>
                🔴 Expired
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded mt-2"
                  onClick={() => {
                    window.location.href = `/api/meta/connect?reconnect=${account.id}`;
                  }}
                >
                  Reconnect
                </button>
              </div>
            )}

            {account.status === "error" && <div>🟠 Error</div>}
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
