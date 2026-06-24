"use client";

import Navbar from "../../../components/Navbar";
import StatsCards from "../../../components/StatsCards";
import CreatePostForm from "../../../components/CreatePostForm";
import PostCalendar from "../../../components/PostCalendar";
import { useState, useEffect } from "react";
import { Post } from "../../../types";

export default function Home() {
  const [posts, setPosts] = useState< []>([]);
  const [stats, setStats] = useState({
    scheduled: 0,
    published: 0,
    failed: 0,
    accounts: 0,
  });
  
  async function loadPosts() {
    const response = await fetch("/api/posts");
    const data = await response.json();
    setPosts(data);
  }

useEffect(() => {

  loadPosts();
  loadStats();

}, []);

const loadStats = async () => {

  const response =
    await fetch(
      "/api/dashboard/stats"
    );

  const data =
    await response.json();

  setStats(data);

};

  useEffect(() => {
    const interval = setInterval(() => {
      loadPosts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">

      <div className="flex-1 p-6">
        <Navbar />
        <StatsCards stats={stats} />

        <PostCalendar posts={posts} />

        <CreatePostForm posts={posts} setPosts={setPosts} />
      </div>
    </div>
  );
}
