"use client";

import { DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

import { useEffect, useState } from "react";
import { FaFacebook, FaInstagram } from "react-icons/fa";

type Page = {
  pageId: string;
  pageName: string;
  hasFacebook: boolean;
  hasInstagram: boolean;
  instagramBusinessId?: string | null;
};

export default function SelectAccountsPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [selected, setSelected] = useState<
    Record<
      string,
      {
        facebook: boolean;
        instagram: boolean;
      }
    >
  >({});

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/account-selection");

        const data = await response.json();

        setPages(data.pages || []);

        /*
          initialize state
        */
        const initial: Record<
          string,
          {
            facebook: boolean;
            instagram: boolean;
          }
        > = {};

        for (const page of data.pages || []) {
          initial[page.pageId] = {
            facebook: false,
            instagram: false,
          };
        }

        setSelected(initial);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function selectedCount() {
    return Object.values(selected).reduce(
      (sum, current) =>
        sum + Number(current.facebook) + Number(current.instagram),
      0,
    );
  }

  async function connectAccounts() {
    const selectedPages = pages
      .filter((page) => {
        const s = selected[page.pageId];

        return s?.facebook || s?.instagram;
      })
      .map((page) => ({
        pageId: page.pageId,

        pageName: page.pageName,

        facebook: selected[page.pageId]?.facebook,

        instagram: selected[page.pageId]?.instagram,

        instagramBusinessId: page.instagramBusinessId,
      }));

    if (selectedPages.length === 0) {
      alert("Please select at least one account");

      return;
    }

    try {
      setConnecting(true);

      const response = await fetch("/api/meta/connect-pages", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          pages: selectedPages,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.redirect || "/accounts";
      } else {
        alert(data.error || "Failed to connect accounts");
      }
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return <DizitoPage className="px-4 sm:px-6"><DizitoState kind="empty" title="Loading accounts" description="Please wait while available resources are loaded." /></DizitoPage>;
  }

  return (
    <DizitoPage className="max-w-4xl px-4 sm:px-6">
      <DizitoPageHeader eyebrow="Connected accounts" title="Select accounts" description="Choose which Facebook and Instagram accounts to connect." />

      <div className="space-y-4">
        {pages.map((page) => (
          <div key={page.pageId} className="dizito-card">
            <div className="font-semibold text-lg mb-4">{page.pageName}</div>

            <div className="flex flex-wrap gap-4">
              {page.hasFacebook && (
                <label className="flex items-center gap-2 min-w-fit">
                  <input
                    type="checkbox"
                    checked={selected[page.pageId]?.facebook || false}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [page.pageId]: {
                          ...prev[page.pageId],
                          facebook: e.target.checked,
                        },
                      }))
                    }
                  />

                  <FaFacebook className="text-blue-600" />

                  <span>Facebook</span>
                </label>
              )}

              {page.hasInstagram ? (
                <label className="flex items-center gap-2 min-w-fit">
                  <input
                    type="checkbox"
                    checked={selected[page.pageId]?.instagram || false}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [page.pageId]: {
                          ...prev[page.pageId],
                          instagram: e.target.checked,
                        },
                      }))
                    }
                  />

                  <FaInstagram className="text-pink-500" />

                  <span>Instagram</span>
                </label>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <FaInstagram />

                  <span>Instagram not linked</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          disabled={connecting}
          onClick={connectAccounts}
          className="dizito-button dizito-button-primary"
        >
          {connecting
            ? "Connecting..."
            : `Connect Selected (${selectedCount()})`}
        </button>

        <div className="text-gray-500">
          Selected: {selectedCount()} account(s)
        </div>
      </div>
    </DizitoPage>
  );
}
