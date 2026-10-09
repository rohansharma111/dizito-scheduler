"use client";

import { useState } from "react";
import { Code2, RefreshCw } from "lucide-react";
import { DizitoBadge, DizitoCard, DizitoPage, DizitoPageHeader, DizitoSectionHeader } from "@/components/dizito/DizitoUI";

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
    <DizitoPage className="max-w-4xl px-4 sm:px-6">
      <DizitoPageHeader eyebrow="Internal tools" title="Billing dev console" description="Internal-only API testing. Actions can create or cancel subscriptions; use test credentials and non-production accounts." />
      <div className="mb-5"><DizitoBadge tone="warning"><Code2 size={13} /> Developer tool — not customer-facing</DizitoBadge></div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          disabled={loading}
          onClick={() => callApi("/api/billing/create-subscription", "POST")}
          className="dizito-button dizito-button-primary min-h-14 justify-start whitespace-normal text-left"
        >
          Create Creator Subscription
        </button>

        <button
          disabled={loading}
          onClick={() => callApi("/api/billing", "GET")}
          className="dizito-button dizito-button-secondary min-h-14 justify-start whitespace-normal text-left"
        >
          Get Billing Status
        </button>

        <button
          disabled={loading}
          onClick={() => callApi("/api/billing/cancel", "POST")}
          className="dizito-button dizito-button-danger min-h-14 justify-start whitespace-normal text-left"
        >
          Cancel Subscription
        </button>
      </div>

      <DizitoCard tone="soft">
        <DizitoSectionHeader title="API response" description="The raw response from the last request." action={<RefreshCw size={17} className="text-violet-600" />} />

        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs sm:text-sm">
          {JSON.stringify(response, null, 2)}
        </pre>
      </DizitoCard>
    </DizitoPage>
  );
}
