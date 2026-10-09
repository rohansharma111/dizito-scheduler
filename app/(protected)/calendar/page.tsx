"use client";

import PostCalendar from "@/components/PostCalendar";
import { DizitoCard, DizitoPage, DizitoPageHeader, DizitoState, DizitoButton } from "@/components/dizito/DizitoUI";
import { Post } from "../../../types";
import { useEffect, useState } from "react";

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/posts");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load calendar");
      if (!Array.isArray(data)) throw new Error("Unexpected calendar response");
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  return (
    <DizitoPage>
      <DizitoPageHeader
        eyebrow="Publishing"
        title="Calendar"
        description="Review scheduled and published content in one place."
        action={<DizitoButton variant="secondary" onClick={() => void loadPosts()} disabled={loading}>Refresh</DizitoButton>}
      />
      {error && (
        <DizitoState
          kind="error"
          title="Calendar could not load"
          description={error}
          action={<DizitoButton variant="secondary" onClick={() => void loadPosts()}>Try again</DizitoButton>}
        />
      )}
      <DizitoCard>
        {loading ? (
          <div role="status" aria-label="Loading calendar" className="animate-pulse space-y-4 py-2"><div className="h-5 w-40 rounded-lg bg-slate-100"/><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map((item)=><div key={item} className="h-28 rounded-2xl border border-slate-100 bg-slate-50"/>)}</div><div className="h-56 rounded-2xl bg-slate-50"/></div>
        ) : posts.length === 0 ? (
          <DizitoState
            kind="empty"
            title="No content scheduled yet"
            description="Create a post or generate your weekly plan to start filling the calendar."
            action={<DizitoButton onClick={() => { window.location.href = "/generate-week"; }}>Generate My Week</DizitoButton>}
          />
        ) : (
          <PostCalendar posts={posts} />
        )}
      </DizitoCard>
    </DizitoPage>
  );
}
