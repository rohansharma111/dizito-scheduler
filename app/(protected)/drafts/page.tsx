"use client";

import { useEffect, useState } from "react";
import DraftPosts from "../../../components/DraftPosts";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);

  async function loadDrafts() {
    const response = await fetch("/api/posts");

    const data = await response.json();

    const draftPosts = data.filter((post: any) => post.status === "draft");

    setDrafts(draftPosts);
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  return (
    <div className="p-6">
      <DraftPosts posts={drafts} setPosts={setDrafts} />
    </div>
  );
}
