"use client";

import { useEffect, useState } from "react";
import DraftPosts from "../../../components/DraftPosts";
import { DizitoCard, DizitoPage, DizitoPageHeader, DizitoState, DizitoButton } from "@/components/dizito/DizitoUI";

type DraftPost = { id: number; status: string; [key: string]: unknown };

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDrafts() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/posts");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load drafts");
      if (!Array.isArray(data)) throw new Error("Unexpected drafts response");
      setDrafts(data.filter((post: DraftPost) => post.status === "draft"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDrafts();
  }, []);

  return (
    <DizitoPage>
      <DizitoPageHeader
        eyebrow="Content"
        title="Drafts"
        description="Review unfinished posts and continue preparing them for approval or publishing."
        action={<DizitoButton variant="secondary" onClick={() => void loadDrafts()} disabled={loading}>Refresh</DizitoButton>}
      />
      {error && <DizitoState kind="error" title="Drafts could not load" description={error} action={<DizitoButton variant="secondary" onClick={() => void loadDrafts()}>Try again</DizitoButton>} />}
      <DizitoCard>
        {loading ? (
          <div className="animate-pulse space-y-3" aria-label="Loading drafts">
            <div className="h-5 w-1/3 rounded bg-slate-100" />
            <div className="h-24 rounded-xl bg-slate-100" />
          </div>
        ) : error ? (
          <p className="text-sm text-slate-500">Drafts will appear here once the request succeeds.</p>
        ) : drafts.length === 0 ? (
          <DizitoState kind="empty" title="No drafts yet" description="New drafts will appear here when you save content without scheduling it." />
        ) : (
          <DraftPosts posts={drafts} setPosts={setDrafts} />
        )}
      </DizitoCard>
    </DizitoPage>
  );
}
