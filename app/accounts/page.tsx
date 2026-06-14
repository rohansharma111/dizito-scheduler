"use client";

import { useEffect, useState } from "react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data);
      });
  }, []);

  const connectInstagram = () => {
    window.location.href = "/api/meta/connect";
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Connected Accounts</h1>

        <button
          onClick={connectInstagram}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Connect Instagram
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="border rounded p-6 text-center">
          No accounts connected yet.
        </div>
      )}

      {accounts.map((account) => (
        <div key={account.id} className="border p-4 rounded mb-4">
          <div className="font-bold text-lg">{account.account_name}</div>

          <div className="text-gray-600">{account.platform}</div>

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
              await fetch(`/api/accounts/${account.id}`, {
                method: "DELETE",
              });

              setAccounts(accounts.filter((a) => a.id !== account.id));
            }}
          >
            Disconnect
          </button>
        </div>
      ))}
    </div>
  );
}
