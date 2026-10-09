"use client";

import { useEffect, useState } from "react";
import { DizitoCard, DizitoPage, DizitoPageHeader, DizitoState, DizitoButton } from "@/components/dizito/DizitoUI";
import ScheduledPosts from "../../../components/ScheduledPosts";
import PublishDetailsModal from "../../../components/PublishDetailsModal";
import { Post } from "@/types";

type PublishTarget = {
  id: number;
  platform: string;
  status: string;
  account_name?: string;
  social_account_id: number;
  published_at?: string | null;
  publish_message?: string | null;
  retry_count?: number;
  manual_retry_count?: number;
  next_retry_at?: string | null;
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<PublishTarget[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  async function loadPosts() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/posts");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load posts");
      if (!Array.isArray(data)) throw new Error("Unexpected posts response");
      setPosts(data.filter((post: Post) => post.status !== "draft"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
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
        title="Posts"
        description="Track scheduled and published posts, review delivery status, and inspect channel-level results."
        action={<DizitoButton variant="secondary" onClick={() => void loadPosts()} disabled={loading}>Refresh</DizitoButton>}
      />
      {error && <DizitoState kind="error" title="Posts could not load" description={error} action={<DizitoButton variant="secondary" onClick={() => void loadPosts()}>Try again</DizitoButton>} />}
      <DizitoCard>
        {loading ? (
          <div className="animate-pulse space-y-3" aria-label="Loading posts">
            <div className="h-5 w-1/3 rounded bg-slate-100" />
            <div className="h-20 rounded-xl bg-slate-100" />
            <div className="h-20 rounded-xl bg-slate-100" />
          </div>
        ) : error ? (
          <p className="text-sm text-slate-500">Posts will appear here when the request succeeds.</p>
        ) : posts.length === 0 ? (
          <DizitoState kind="empty" title="No scheduled or published posts" description="Create a post or generate your weekly plan to start publishing." action={<DizitoButton onClick={() => { window.location.href = "/generate-week"; }}>Generate My Week</DizitoButton>} />
        ) : (
          <ScheduledPosts
            posts={posts}
            setPosts={setPosts}
            setSelectedTargets={setSelectedTargets}
            setSelectedPostId={setSelectedPostId}
            setShowTargetsModal={setShowTargetsModal}
          />
        )}
      </DizitoCard>
      <PublishDetailsModal
        open={showTargetsModal}
        onClose={() => setShowTargetsModal(false)}
        targets={selectedTargets}
        postId={selectedPostId}
        setTargets={setSelectedTargets}
      />
    </DizitoPage>
  );
}
