"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";
import DraftPosts from "../../../components/DraftPosts";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDrafts() {
    try {
      const response = await fetch("/api/posts");

      const data = await response.json();

      const draftPosts = data.filter((post: any) => post.status === "draft");

      setDrafts(draftPosts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  if (loading) {
    return <div className="p-6">Loading drafts...</div>;
  }

  return (
    <div className="p-6">
      <DraftPosts posts={drafts} setPosts={setDrafts} />
    </div>
  );
}
