"use client";

import { useState } from "react";

import { Post } from "../types";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaPinterest,
} from "react-icons/fa";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";

import { Pencil, Trash2, Copy, Eye, RotateCcw } from "lucide-react";
import styles from "./PostLists.module.css";
import TablePagination from "@/components/dizito/TablePagination";

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
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledPageSize, setScheduledPageSize] = useState(25);

  async function refreshPosts() {
    const response = await fetch("/api/posts");

    const data = await response.json();

    setPosts(data);
  }
  const scheduledPosts = posts.filter((item) => item.status !== "draft");

  const currentScheduledPage = Math.min(scheduledPage, Math.max(1, Math.ceil(scheduledPosts.length / scheduledPageSize)));
  const paginatedScheduledPosts = scheduledPosts.slice((currentScheduledPage - 1) * scheduledPageSize, currentScheduledPage * scheduledPageSize);

  if (scheduledPosts.length === 0) {
    return (
      <div className={`mt-8 ${styles.root}`}>
        <h3 className={`mb-4 text-xl font-extrabold tracking-tight text-slate-950 ${styles.heading}`}>Scheduled / Published Posts</h3>

        <div
          className={`bg-white border rounded-2xl p-12 text-center ${styles.emptyState}`}
        >
          <div className="text-5xl mb-4">🚀</div>

          <h4 className="text-lg font-semibold">No posts yet</h4>

          <p className="text-gray-500 mt-2">
            Create your first post and schedule it across your social accounts.
          </p>

          <a
            href="#draft"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#c7f36b] px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-[#9fda35]"
          >
            Create Post
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-8 ${styles.root}`}>
      <h3 className={`mb-4 text-xl font-extrabold tracking-tight text-slate-950 ${styles.heading}`}>Scheduled / Published Posts</h3>

      {/* DESKTOP */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`w-full border ${styles.table}`}>
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
            {paginatedScheduledPosts
              .map((item: Post) => {
                const canRetry =
                  [
                    "retry_scheduled",
                    "permanent_failed",
                    "failure_handler_crashed",
                  ].includes(item.status) &&
                  (item.targets?.some(
                    (target) => target.manual_retry_count < 3,
                  ) ??
                    false);

                return (
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

                            {target.platform === "pinterest" && (
                              <FaPinterest className="text-red-600 text-xl" />
                            )}

                            {target.platform === "google-business" && (
                              <GoogleBusinessIcon className="text-green-600 text-xl" />
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
                                      : target.status === "permanent_failed"
                                        ? "bg-red-500"
                                        : target.status ===
                                            "failure_handler_crashed"
                                          ? "bg-red-700"
                                          : target.status === "processing"
                                            ? "bg-yellow-500"
                                            : target.status ===
                                                "retry_scheduled"
                                              ? "bg-orange-500"
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
                      {/* Published */}
                      {item.status === "published" && (
                        <span className="text-green-600 font-medium">
                          Published
                        </span>
                      )}

                      {/* Scheduled */}
                      {item.status === "scheduled" && (
                        <span className="text-blue-600 font-medium">
                          Scheduled
                        </span>
                      )}

                      {/* Processing */}
                      {item.status === "processing" && (
                        <span className="text-yellow-600 font-medium">
                          Processing
                        </span>
                      )}

                      {/* Auto retry */}

                      {item.status === "retry_scheduled" && (
                        <div>
                          <div className="text-orange-600 font-medium">
                            Retrying
                          </div>

                          <div className="text-xs text-gray-500">
                            System retry in progress
                          </div>
                        </div>
                      )}

                      {/* Permanent failed */}
                      {item.status === "permanent_failed" && (
                        <div>
                          <div className="text-red-600 font-medium">
                            Automatic retries exhausted
                          </div>

                          <div className="text-xs text-gray-500">
                            Check Details for retry history
                          </div>
                        </div>
                      )}

                      {/* Partial failed */}
                      {item.status === "partial_failed" && (
                        <div>
                          <div className="text-orange-600 font-medium">
                            Partially Published
                          </div>

                          <div className="text-xs text-gray-500">
                            Some platforms failed. Check Details.
                          </div>
                        </div>
                      )}

                      {/* Failure handler crashed */}
                      {item.status === "failure_handler_crashed" && (
                        <div>
                          <div className="text-red-700 font-medium">
                            System Error
                          </div>

                          <div className="text-xs text-gray-500">
                            Recovery required
                          </div>
                        </div>
                      )}

                      {/* Retry button */}
                      {canRetry && (
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
                      )}

                      {/* Details */}
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
                        {/* VIEW */}
                        <button
                          title="View"
                          className="
    p-2
    rounded
    hover:bg-gray-100
    text-gray-700
  "
                          onClick={() => {
                            window.location.href = `/posts/${item.id}/edit?view=true`;
                          }}
                        >
                          <Eye size={18} />
                        </button>

                        {/* EDIT */}
                        {[
                          "scheduled",
                          "retry_scheduled",
                          "permanent_failed",
                          "failure_handler_crashed",
                          "draft",
                        ].includes(item.status) && (
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
                );
              })}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="md:hidden space-y-4">
        {paginatedScheduledPosts
              .map((item: Post) => {
            const canRetry =
              [
                "retry_scheduled",
                "permanent_failed",
                "failure_handler_crashed",
              ].includes(item.status) &&
              (item.targets?.some((target) => target.manual_retry_count < 3) ??
                false);

            return (
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

                      {target.platform === "pinterest" && (
                        <FaPinterest className="text-red-600 text-xl" />
                      )}

                      {target.platform === "google-business" && (
                        <GoogleBusinessIcon className="text-green-600 text-xl" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-sm text-gray-500">
                  {item.schedule_time &&
                    new Date(item.schedule_time).toLocaleString("en-IN")}
                </div>

                <div className="mt-3">
                  {item.status === "published" && (
                    <span className="text-green-600 font-medium">
                      Published
                    </span>
                  )}

                  {item.status === "scheduled" && (
                    <span className="text-blue-600 font-medium">Scheduled</span>
                  )}

                  {item.status === "processing" && (
                    <span className="text-yellow-600 font-medium">
                      Processing
                    </span>
                  )}

                  {item.status === "retry_scheduled" && (
                    <span className="text-orange-600 font-medium">
                      Retrying
                    </span>
                  )}

                  {item.status === "permanent_failed" && (
                    <span className="text-red-600 font-medium">
                      Automatic retries exhausted
                    </span>
                  )}

                  {item.status === "failure_handler_crashed" && (
                    <span className="text-red-700 font-medium">
                      System Error
                    </span>
                  )}

                  {item.status === "partial_failed" && (
                    <span className="text-orange-600 font-medium">
                      Partially Published
                    </span>
                  )}
                </div>

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

                  {/* DETAILS */}
                  <button
                    title="Details"
                    className="
    flex
    flex-col
    items-center
    justify-center
    gap-1
    p-3
    rounded-lg
    bg-gray-700
    hover:bg-gray-800
    text-white
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

                    <span className="text-xs">Details</span>
                  </button>

                  {/* EDIT */}
                  {[
                    "scheduled",
                    "retry_scheduled",
                    "permanent_failed",
                    "failure_handler_crashed",
                  ].includes(item.status) && (
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

                  {/* RETRY */}
                  {canRetry && (
                    <button
                      title="Retry"
                      className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  gap-1
                  p-3
                  rounded-lg
                  bg-orange-50
                  hover:bg-orange-100
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
                      <RotateCcw size={18} className="text-orange-600" />

                      <span className="text-xs">Retry</span>
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
            );
          })}
      </div>
      <TablePagination
        page={currentScheduledPage}
        pageSize={scheduledPageSize}
        totalItems={scheduledPosts.length}
        itemLabel="posts"
        onPageChange={setScheduledPage}
        onPageSizeChange={(size) => { setScheduledPageSize(size); setScheduledPage(1); }}
      />
    </div>
  );
}
