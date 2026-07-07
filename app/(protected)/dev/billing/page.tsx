"use client";

import { useState } from "react";

export default function DevBillingPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  async function callApi(url: string, method: "GET" | "POST") {
    setLoading(true);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        ...(method === "POST"
          ? {
              body: JSON.stringify({
                plan: "creator",
              }),
            }
          : {}),
      });

      const data = await res.json();

      setResponse(data);

      console.log(data);
    } catch (err) {
      console.error(err);

      setResponse({
        error: String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing Dev Console</h1>

        <p className="text-gray-500 mt-2">Internal testing page.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          disabled={loading}
          onClick={() => callApi("/api/billing/create-subscription", "POST")}
          className="bg-blue-600 text-white rounded-lg p-4"
        >
          Create Creator Subscription
        </button>

        <button
          disabled={loading}
          onClick={() => callApi("/api/billing", "GET")}
          className="bg-green-600 text-white rounded-lg p-4"
        >
          Get Billing Status
        </button>

        <button
          disabled={loading}
          onClick={() => callApi("/api/billing/cancel", "POST")}
          className="bg-red-600 text-white rounded-lg p-4"
        >
          Cancel Subscription
        </button>
      </div>

      <div className="border rounded-xl p-6 bg-gray-50">
        <div className="font-semibold mb-3">API Response</div>

        <pre className="text-sm whitespace-pre-wrap overflow-auto">
          {JSON.stringify(response, null, 2)}
        </pre>
      </div>
    </div>
  );
}
