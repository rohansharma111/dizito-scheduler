"use client";

import { useState } from "react";
import { Post } from "../types";
import { FaInstagram, FaFacebook, FaLinkedin, FaPinterest } from "react-icons/fa";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";
import { Eye, Pencil, Trash2, Copy, CalendarPlus } from "lucide-react";
import styles from "./PostLists.module.css";
import TablePagination from "@/components/dizito/TablePagination";

export default function DraftPosts({
  posts,
  setPosts,
}: {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
}) {
  const [draftsPage, setDraftsPage] = useState(1);
  const [draftsPageSize, setDraftsPageSize] = useState(25);

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

  const currentDraftsPage = Math.min(draftsPage, Math.max(1, Math.ceil(drafts.length / draftsPageSize)));
  const paginatedDrafts = drafts.slice((currentDraftsPage - 1) * draftsPageSize, currentDraftsPage * draftsPageSize);

  if (drafts.length === 0) {
    return (
      <div className={`mt-8 ${styles.root}`}>
        <h3 className={`mb-4 text-xl font-extrabold tracking-tight text-slate-950 ${styles.heading}`}>Draft Posts</h3>

        <div
          className={`bg-white border rounded-2xl p-12 text-center ${styles.emptyState}`}
        >
          <div className="text-5xl mb-4">📝</div>

          <h4 className="text-lg font-semibold">No draft posts yet</h4>

          <p className="text-gray-500 mt-2">
            Save posts as drafts to continue working on them later.
          </p>

          <a
            href="#draft"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#c7f36b] px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-[#9fda35]"
          >
            Create Draft
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-8 ${styles.root}`}>
      <h3 className={`mb-4 text-xl font-extrabold tracking-tight text-slate-950 ${styles.heading}`}>Draft Posts</h3>

      {/* MOBILE */}
      <div className="md:hidden space-y-4">
        {paginatedDrafts.map((item) => (
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

                  {target.platform === "pinterest" && (
                    <FaPinterest className="text-red-600 text-xl" />
                  )}

                  {target.platform === "google-business" && (
                    <GoogleBusinessIcon size={20} />
                  )}
                </div>
              ))}
            </div>

            <div
              className="mt-4 grid grid-cols-5 gap-1.5 min-[360px]:gap-2"
            >
              {/* VIEW */}
              <button
                title="View"
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 p-2 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 min-[360px]:p-2.5" aria-label="View draft"
                onClick={() => {
                  window.location.href = `/posts/${item.id}/edit?view=true`;
                }}
              >
                <Eye size={18} className="text-gray-700" />

                <span className="hidden text-[10px] font-semibold leading-none min-[360px]:inline min-[420px]:text-xs">View</span>
              </button>

              {/* EDIT */}
              <button
                title="Edit"
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-amber-50 p-2 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 min-[360px]:p-2.5" aria-label="Edit draft"
                onClick={() => {
                  window.location.href = `/posts/${item.id}/edit`;
                }}
              >
                <Pencil size={18} className="text-yellow-600" />

                <span className="hidden text-[10px] font-semibold leading-none min-[360px]:inline min-[420px]:text-xs">Edit</span>
              </button>

              {/* DELETE */}
              <button
                title="Delete"
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-rose-50 p-2 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 min-[360px]:p-2.5" aria-label="Delete draft"
                onClick={() => deletePost(item.id)}
              >
                <Trash2 size={18} className="text-red-600" />

                <span className="hidden text-[10px] font-semibold leading-none min-[360px]:inline min-[420px]:text-xs">Delete</span>
              </button>

              {/* DUPLICATE */}
              <button
                title="Duplicate"
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-emerald-50 p-2 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 min-[360px]:p-2.5" aria-label="Duplicate draft"
                onClick={() => duplicatePost(item.id)}
              >
                <Copy size={18} className="text-green-600" />

                <span className="hidden text-[10px] font-semibold leading-none min-[360px]:inline min-[420px]:text-xs">Copy</span>
              </button>

              {/* SCHEDULE */}
              <button
                title="Schedule"
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-violet-50 p-2 transition hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 min-[360px]:p-2.5" aria-label="Schedule draft"
                onClick={() => {
                  window.location.href = `/posts/${item.id}/edit?schedule=true`;
                }}
              >
                <CalendarPlus size={18} className="text-blue-600" />

                <span className="hidden text-[10px] font-semibold leading-none min-[360px]:inline min-[420px]:text-xs">Schedule</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <table className={`w-full border ${styles.table}`}>
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Post</th>

              <th className="border p-2">Targets</th>

              <th className="border p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedDrafts.map((item) => (
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

                        {target.platform === "pinterest" && (
                          <FaPinterest className="text-red-600 text-xl" />
                        )}

                        {target.platform === "google-business" && (
                          <GoogleBusinessIcon size={20} />
                        )}
                      </div>
                    ))}
                  </div>
                </td>

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

                    {/* DELETE */}
                    <button
                      title="Delete"
                      className="
      p-2
      rounded
      hover:bg-red-100
      text-red-600
    "
                      onClick={() => deletePost(item.id)}
                    >
                      <Trash2 size={18} />
                    </button>

                    {/* DUPLICATE */}
                    <button
                      title="Duplicate"
                      className="
      p-2
      rounded
      hover:bg-green-100
      text-green-600
    "
                      onClick={() => duplicatePost(item.id)}
                    >
                      <Copy size={18} />
                    </button>

                    {/* SCHEDULE */}
                    <button
                      title="Schedule"
                      className="
      p-2
      rounded
      hover:bg-blue-100
      text-blue-600
    "
                      onClick={() => {
                        window.location.href = `/posts/${item.id}/edit?schedule=true`;
                      }}
                    >
                      <CalendarPlus size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={currentDraftsPage}
        pageSize={draftsPageSize}
        totalItems={drafts.length}
        itemLabel="drafts"
        onPageChange={setDraftsPage}
        onPageSizeChange={(size) => { setDraftsPageSize(size); setDraftsPage(1); }}
      />
    </div>
  );
}
