"use client";

import { useEffect, useState } from "react";
import ScheduledPosts from "../../../components/ScheduledPosts";
import PublishDetailsModal from "../../../components/PublishDetailsModal";

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);

  const [showTargetsModal, setShowTargetsModal] = useState(false);

  const [selectedTargets, setSelectedTargets] = useState<any[]>([]);

  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  async function loadPosts() {
    const response = await fetch("/api/posts");

    const data = await response.json();

    const scheduledPosts = data.filter((post: any) => post.status !== "draft");

    setPosts(scheduledPosts);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Scheduled / Published Posts</h1>

      <ScheduledPosts
        posts={posts}
        setPosts={setPosts}
        setSelectedTargets={setSelectedTargets}
        setSelectedPostId={setSelectedPostId}
        setShowTargetsModal={setShowTargetsModal}
      />

      <PublishDetailsModal
        open={showTargetsModal}
        onClose={() => setShowTargetsModal(false)}
        targets={selectedTargets}
        postId={selectedPostId}
        setTargets={setSelectedTargets}
      />
    </div>
  );
}
