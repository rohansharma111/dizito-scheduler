"use client";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatsCards from "../../components/StatsCards";
import CreatePostForm from "../../components/CreatePostForm";
import PostCalendar from "../../components/PostCalendar";
import { useState, useEffect } from "react";
import { Post } from "../../types";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);

  async function loadPosts() {
    const response = await fetch("/api/posts");
    const data = await response.json();
    setPosts(data);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadPosts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 p-6">
        <Navbar />
        <StatsCards posts={posts} />

        <PostCalendar posts={posts} />

        <CreatePostForm
          posts={posts}
          setPosts={setPosts}
        />
      </div>
    </div>
  );
}