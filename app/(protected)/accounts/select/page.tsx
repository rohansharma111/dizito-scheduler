"use client";

import { useEffect, useState } from "react";

export default function SelectAccountsPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/account-selection")
      .then((res) => res.json())
      .then((data) => {
        setPages(data.pages || []);
      });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Select Accounts</h1>

      <div className="space-y-3">
        {pages.map((page: any) => (
          <div
            key={page.id}
            className="border p-3 rounded flex items-center gap-3"
          >
            <input
              type="checkbox"
              checked={selectedPages.includes(page.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedPages([...selectedPages, page.id]);
                } else {
                  setSelectedPages(
                    selectedPages.filter((id) => id !== page.id),
                  );
                }
              }}
            />

            <span>{page.name}</span>
          </div>
        ))}
      </div>

      <button
        className="mt-6 bg-blue-600 text-white px-6 py-3 rounded"
        onClick={async () => {
          const response = await fetch("/api/connect-pages", {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              selectedPages,
            }),
          });

          const data = await response.json();

          console.log(data);

          if (response.ok) {
            window.location.href = "/accounts";
          } else {
            alert(data.error || "Failed to connect accounts");
          }
        }}
      >
        Connect Selected
      </button>
    </div>
  );
}
