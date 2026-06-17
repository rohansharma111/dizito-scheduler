"use client";

import { useEffect, useState } from "react";

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);

  async function loadPosts() {
    const response = await fetch("/api/posts");
    const data = await response.json();

    const scheduledPosts = data.filter(
      (post: any) =>
        post.status === "scheduled"
    );

    setPosts(scheduledPosts);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Scheduled Posts
      </h1>

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="border rounded p-4"
          >
            <p className="font-medium">
              {post.post}
            </p>

            <p className="text-sm text-gray-500">
              {new Date(
                post.schedule_time
              ).toLocaleString()}
            </p>

            <div className="mt-3 flex gap-2">
              <a
                href={`/posts/${post.id}/edit`}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                Edit
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}