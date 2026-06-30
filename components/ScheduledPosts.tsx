"use client";

import { Post } from "../types";
import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";
import { Pencil, Trash2, Copy, Eye, RotateCcw } from "lucide-react";

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
                          title="Retry"
                          className="
    ml-2
    p-2
    rounded
    hover:bg-yellow-100
    text-yellow-600
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
                          <RotateCcw size={16} />
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
                    <div className="flex items-center gap-2">
                      {/* DETAILS */}
                      <button
                        title="Details"
                        className="
        p-2
        rounded
        hover:bg-gray-100
        text-gray-700
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
                        <Eye size={18} />
                      </button>

                      {/* EDIT */}
                      {["scheduled", "failed", "draft"].includes(
                        item.status,
                      ) && (
                        <button
                          title="Edit"
                          className="
          p-2
          rounded
          hover:bg-yellow-100
          text-yellow-600
        "
                          onClick={() => {
                            window.location.href = `/posts/${item.id}/edit`;
                          }}
                        >
                          <Pencil size={18} />
                        </button>
                      )}

                      {/* DELETE */}
                      {item.status !== "processing" && (
                        <button
                          title="Delete"
                          className="
          p-2
          rounded
          hover:bg-red-100
          text-red-600
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
                          <Trash2 size={18} />
                        </button>
                      )}

                      {/* DUPLICATE */}
                      {item.status !== "published" && (
                        <button
                          title="Duplicate"
                          className="
          p-2
          rounded
          hover:bg-green-100
          text-green-600
        "
                          onClick={async () => {
                            await fetch(`/api/posts/${item.id}/duplicate`, {
                              method: "POST",
                            });

                            await refreshPosts();
                          }}
                        >
                          <Copy size={18} />
                        </button>
                      )}
                    </div>
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

              <div
                className="
    grid
    grid-cols-4
    gap-2
    mt-4
  "
              >
                {/* VIEW */}
                <button
                  title="View"
                  className="
      flex
      flex-col
      items-center
      justify-center
      gap-1
      p-3
      rounded-lg
      bg-gray-100
      hover:bg-gray-200
    "
                  onClick={() => {
                    window.location.href = `/posts/${item.id}/edit?view=true`;
                  }}
                >
                  <Eye size={18} className="text-gray-700" />

                  <span className="text-xs">View</span>
                </button>

                {/* EDIT */}
                {["scheduled", "failed"].includes(item.status) && (
                  <button
                    title="Edit"
                    className="
        flex
        flex-col
        items-center
        justify-center
        gap-1
        p-3
        rounded-lg
        bg-yellow-50
        hover:bg-yellow-100
      "
                    onClick={() => {
                      window.location.href = `/posts/${item.id}/edit`;
                    }}
                  >
                    <Pencil size={18} className="text-yellow-600" />

                    <span className="text-xs">Edit</span>
                  </button>
                )}

                {/* DELETE */}
                {item.status !== "processing" && (
                  <button
                    title="Delete"
                    className="
        flex
        flex-col
        items-center
        justify-center
        gap-1
        p-3
        rounded-lg
        bg-red-50
        hover:bg-red-100
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
                    <Trash2 size={18} className="text-red-600" />

                    <span className="text-xs">Delete</span>
                  </button>
                )}

                {/* DUPLICATE */}
                {item.status !== "published" && (
                  <button
                    title="Duplicate"
                    className="
        flex
        flex-col
        items-center
        justify-center
        gap-1
        p-3
        rounded-lg
        bg-green-50
        hover:bg-green-100
      "
                    onClick={async () => {
                      await fetch(`/api/posts/${item.id}/duplicate`, {
                        method: "POST",
                      });

                      await refreshPosts();
                    }}
                  >
                    <Copy size={18} className="text-green-600" />

                    <span className="text-xs">Copy</span>
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
