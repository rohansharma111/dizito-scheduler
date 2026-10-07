"use client";

import PostCalendar from "@/components/PostCalendar";
import { RefreshCw } from "lucide-react";
import { DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";
import { Post } from "../../../types";
import { useEffect, useState } from "react";

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/posts");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load calendar");
      setPosts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Calendar
      </h1>

      <PostCalendar posts={posts} />
    </div>
  );
}