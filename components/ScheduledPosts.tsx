"use client";

import { Post } from "../types";
import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";

type Props = {
  posts: Post[];
  setPosts: (posts: Post[]) => void;

  setSelectedTargets: (targets: any[]) => void;

  setSelectedPostId: (id: number | null) => void;

  setShowTargetsModal: (show: boolean) => void;
};

export default function ScheduledPosts({
  posts,
  setPosts,
  setSelectedTargets,
  setSelectedPostId,
  setShowTargetsModal,
}: Props) {
  async function refreshPosts() {
    const response = await fetch("/api/posts");

    const data = await response.json();

    setPosts(data);
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4">Scheduled / Published Posts</h3>

      {/* DESKTOP */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Post</th>

              <th className="border p-2">Targets</th>

              <th className="border p-2">Time</th>

              <th className="border p-2">Status</th>

              <th className="border p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {posts
              .filter((item: Post) => item.status !== "draft")
              .map((item: Post) => (
                <tr key={item.id}>
                  {/* POST */}
                  <td className="border p-2">{item.post}</td>

                  {/* TARGETS */}
                  <td className="border p-2">
                    <div className="flex items-center gap-3">
                      {item.targets?.map((target) => (
                        <div
                          key={target.id}
                          className="relative"
                          title={`${target.platform} - ${target.status}`}
                        >
                          {target.platform === "instagram" && (
                            <FaInstagram className="text-pink-500 text-xl" />
                          )}

                          {target.platform === "facebook" && (
                            <FaFacebook className="text-blue-600 text-xl" />
                          )}

                          {target.platform === "linkedin" && (
                            <FaLinkedin className="text-blue-700 text-xl" />
                          )}

                          <span
                            className={`
                                  absolute
                                  -bottom-1
                                  -right-1
                                  w-2.5
                                  h-2.5
                                  rounded-full
                                  ${
                                    target.status === "published"
                                      ? "bg-green-500"
                                      : target.status === "failed"
                                        ? "bg-red-500"
                                        : target.status === "processing"
                                          ? "bg-yellow-500"
                                          : "bg-blue-500"
                                  }
                                `}
                          />
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* TIME */}
                  <td className="border p-2">
                    {item.schedule_time &&
                      new Date(item.schedule_time).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                  </td>

                  {/* STATUS */}
                  <td className="border p-2">
                    {item.status === "published" && (
                      <span className="text-green-600">Published</span>
                    )}

                    {item.status === "scheduled" && (
                      <span className="text-blue-600">Scheduled</span>
                    )}

                    {item.status === "processing" && (
                      <span className="text-yellow-600">Processing</span>
                    )}

                    {item.status === "failed" && (
                      <>
                        <span className="text-red-600">Failed</span>

                        <button
                          className="
                              ml-2
                              bg-yellow-500
                              text-white
                              px-2
                              py-1
                              rounded
                            "
                          onClick={async () => {
                            await fetch("/api/posts/retry", {
                              method: "POST",

                              headers: {
                                "Content-Type": "application/json",
                              },

                              body: JSON.stringify({
                                id: item.id,
                              }),
                            });

                            await refreshPosts();
                          }}
                        >
                          Retry
                        </button>
                      </>
                    )}

                    <button
                      className="
                          ml-2
                          bg-gray-700
                          text-white
                          px-3
                          py-1
                          rounded
                        "
                      onClick={async () => {
                        const response = await fetch(
                          `/api/posts/${item.id}/targets`,
                        );

                        const data = await response.json();

                        setSelectedPostId(item.id);

                        setSelectedTargets(data);

                        setShowTargetsModal(true);
                      }}
                    >
                      Details
                    </button>
                  </td>

                  {/* ACTIONS */}
                  <td className="border p-2">
                    {["scheduled", "failed", "draft"].includes(item.status) && (
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
                    )}

                    {item.status !== "processing" && (
                      <button
                        className="
                            ml-2
                            bg-red-500
                            text-white
                            px-3
                            py-1
                            rounded
                          "
                        onClick={async () => {
                          await fetch("/api/posts", {
                            method: "DELETE",

                            headers: {
                              "Content-Type": "application/json",
                            },

                            body: JSON.stringify({
                              id: item.id,
                            }),
                          });

                          await refreshPosts();
                        }}
                      >
                        Delete
                      </button>
                    )}

                    {item.status !== "published" && (
                      <button
                        className="
                            ml-2
                            bg-green-600
                            text-white
                            px-3
                            py-1
                            rounded
                          "
                        onClick={async () => {
                          await fetch(`/api/posts/${item.id}/duplicate`, {
                            method: "POST",
                          });

                          await refreshPosts();
                        }}
                      >
                        Duplicate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="md:hidden space-y-4">
        {posts
          .filter((item: Post) => item.status !== "draft")
          .map((item: Post) => (
            <div
              key={item.id}
              className="
                  border
                  rounded-lg
                  p-4
                  bg-white
                "
            >
              <div className="font-semibold">{item.post}</div>

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

              <div className="mt-3 text-sm text-gray-500">
                {item.schedule_time &&
                  new Date(item.schedule_time).toLocaleString("en-IN")}
              </div>

              <div className="mt-3">{item.status}</div>

              <div className="flex gap-2 mt-4">
                <button
                  className="
                      bg-gray-700
                      text-white
                      px-3
                      py-2
                      rounded
                    "
                >
                  Details
                </button>

                <button
                  className="
                      bg-yellow-500
                      text-white
                      px-3
                      py-2
                      rounded
                    "
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
