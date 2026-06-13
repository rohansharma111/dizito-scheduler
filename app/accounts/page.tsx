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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Connected Accounts</h1>

      {accounts.map((account) => (
        <div key={account.id} className="border p-4 rounded mb-4">
          <div className="font-bold">{account.account_name}</div>

          <div>{account.platform}</div>

          <div>
            {account.status === "connected" && <div>🟢 Connected</div>}

            {account.status === "expired" && <div>🔴 Expired</div>}

            {account.status === "error" && <div>🟠 Error</div>}
          </div>
          <div>
            Last Checked:
            {account.last_checked_at
              ? new Date(account.last_checked_at).toLocaleString()
              : "Never"}
          </div>
          <button
            className="mt-2 bg-red-500 text-white px-3 py-1 rounded"
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
