"use client";

import { useEffect, useState } from "react";

import StatsCards from "@/components/StatsCards";
import CreatePostForm from "@/components/CreatePostForm";
import PostCalendar from "@/components/PostCalendar";

import { Post } from "@/types";

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  const [stats, setStats] = useState({
    scheduled: 0,
    published: 0,
    failed: 0,
    accounts: 0,
  });

  async function loadPosts() {
    try {
      const response = await fetch("/api/posts");

      const data = await response.json();

      setPosts(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadStats() {
    try {
      const response = await fetch("/api/dashboard/stats");

      const data = await response.json();

      setStats(data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadPosts();
    loadStats();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadPosts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 md:space-y-6">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>

        <p className="text-sm md:text-base text-gray-500 mt-1">
          Manage your scheduled posts and social accounts.
        </p>
      </div>

      {/* STATS */}
      <StatsCards stats={stats} />

      {/* CALENDAR */}
      <PostCalendar posts={posts} />

      {/* CREATE POST */}
      <CreatePostForm posts={posts} setPosts={setPosts} />
    </div>
  );
}
