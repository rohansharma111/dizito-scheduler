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
      setPosts(data || []);
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
          <DizitoState kind="loading" title="Loading calendar" description="Fetching your publishing activity." />
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
