"use client";

import PostCalendar from "@/components/PostCalendar";
import { Post } from "../../../types";
import { useEffect, useState } from "react";

export default function CalendarPage() {
  const [posts, setPosts] =
    useState<Post[]>([]);

  async function loadPosts() {
    const response =
      await fetch("/api/posts");

    const data =
      await response.json();

    setPosts(data);
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