"use client";

import { useEffect, useState } from "react";

export default function DraftsPage() {
  const [drafts, setDrafts] =
    useState<any[]>([]);

  async function loadDrafts() {
    const response =
      await fetch("/api/posts");

    const data =
      await response.json();

    const draftPosts =
      data.filter(
        (post: any) =>
          post.status === "draft"
      );

    setDrafts(draftPosts);
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Draft Posts
      </h1>

      <div className="space-y-4">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="border rounded p-4"
          >
            <p className="font-medium">
              {draft.post}
            </p>

            <p className="text-sm text-gray-500">
              Draft
            </p>

            <div className="mt-3 flex gap-2">
              <a
                href={`/posts/${draft.id}/edit`}
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