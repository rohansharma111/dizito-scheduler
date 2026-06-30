"use client";

import { Post } from "../types";
import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";

export default function DraftPosts({
  posts,
  setPosts,
}: {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
}) {
  async function refreshPosts() {
    const response = await fetch("/api/posts");

    const latestPosts = await response.json();

    setPosts(latestPosts);
  }

  async function deletePost(id: number) {
    await fetch("/api/posts", {
      method: "DELETE",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        id,
      }),
    });

    await refreshPosts();
  }

  async function duplicatePost(id: number) {
    await fetch(`/api/posts/${id}/duplicate`, {
      method: "POST",
    });

    await refreshPosts();
  }

  const drafts = posts.filter(
    (item) => item.status === "draft" && item.schedule_time == null,
  );

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4">Draft Posts</h3>

      {/* MOBILE */}
      <div className="md:hidden space-y-4">
        {drafts.map((item) => (
          <div
            key={item.id}
            className="
                bg-white
                border
                rounded-lg
                p-4
              "
          >
            <div className="font-medium">{item.post}</div>

            <div className="flex gap-3 mt-3">
              {item.targets?.map((target) => (
                <div key={target.id}>
                  {target.platform === "instagram" && (
                    <FaInstagram className="text-pink-500 text-xl" />
                  )}

                  {target.platform === "facebook" && (
                    <FaFacebook className="text-blue-600 text-xl" />
                  )}

                  {target.platform === "linkedin" && (
                    <FaLinkedin className="text-blue-700 text-xl" />
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                className="
                    bg-yellow-500
                    text-white
                    py-2
                    rounded
                  "
                onClick={() => {
                  window.location.href = `/posts/${item.id}/edit`;
                }}
              >
                Edit
              </button>

              <button
                className="
                    bg-red-500
                    text-white
                    py-2
                    rounded
                  "
                onClick={() => deletePost(item.id)}
              >
                Delete
              </button>

              <button
                className="
                    bg-green-600
                    text-white
                    py-2
                    rounded
                  "
                onClick={() => duplicatePost(item.id)}
              >
                Duplicate
              </button>

              <button
                className="
                    bg-blue-600
                    text-white
                    py-2
                    rounded
                  "
                onClick={() => {
                  window.location.href = `/posts/${item.id}/edit?schedule=true`;
                }}
              >
                Schedule
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Post</th>

              <th className="border p-2">Targets</th>

              <th className="border p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {drafts.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">{item.post}</td>

                <td className="border p-2">
                  <div className="flex gap-3">
                    {item.targets?.map((target) => (
                      <div key={target.id}>
                        {target.platform === "instagram" && (
                          <FaInstagram className="text-pink-500 text-xl" />
                        )}

                        {target.platform === "facebook" && (
                          <FaFacebook className="text-blue-600 text-xl" />
                        )}

                        {target.platform === "linkedin" && (
                          <FaLinkedin className="text-blue-700 text-xl" />
                        )}
                      </div>
                    ))}
                  </div>
                </td>

                <td className="border p-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="
                          bg-yellow-500
                          text-white
                          px-3
                          py-1
                          rounded
                        "
                      onClick={() => {
                        window.location.href = `/posts/${item.id}/edit`;
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="
                          bg-red-500
                          text-white
                          px-3
                          py-1
                          rounded
                        "
                      onClick={() => deletePost(item.id)}
                    >
                      Delete
                    </button>

                    <button
                      className="
                          bg-green-600
                          text-white
                          px-3
                          py-1
                          rounded
                        "
                      onClick={() => duplicatePost(item.id)}
                    >
                      Duplicate
                    </button>

                    <button
                      className="
                          bg-blue-600
                          text-white
                          px-3
                          py-1
                          rounded
                        "
                      onClick={() => {
                        window.location.href = `/posts/${item.id}/edit?schedule=true`;
                      }}
                    >
                      Schedule
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
