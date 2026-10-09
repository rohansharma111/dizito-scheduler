"use client";

import { useEffect, useState } from "react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaPinterest,
} from "react-icons/fa";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";
import DraftPosts from "./DraftPosts";
import ScheduledPosts from "./ScheduledPosts";
import PublishDetailsModal from "./PublishDetailsModal";
import { useRouter } from "next/navigation";
import MediaPicker from "@/components/media/MediaPicker";
import { MediaItem } from "@/types/media";
import styles from "./CreatePostForm.module.css";

export default function CreatePostForm({ posts, setPosts }: any) {
  const [post, setPost] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [minScheduleTime, setMinScheduleTime] = useState("");
  const [actionLoading, setActionLoading] = useState<
    "draft" | "scheduled" | null
  >(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function loadAccounts() {
      const response = await fetch("/api/social-accounts");
      const data = await response.json();
      setAccounts(data);
    }

    loadAccounts();
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setMinScheduleTime(local.toISOString().slice(0, 16));
  }, []);

  async function refreshPosts() {
    const response = await fetch("/api/posts");
    const latest = await response.json();
    setPosts(latest);
  }

  async function savePost(status: "draft" | "scheduled") {
    if (!post.trim()) {
      alert("Please enter a post");
      return;
    }

    if (status === "scheduled" && !scheduleTime) {
      alert("Please select a date");
      return;
    }

    if (selectedAccounts.length === 0) {
      alert("Select at least one account");
      return;
    }

    setActionLoading(status);
    setSuccessMessage("");

    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post,
          mediaId: selectedMedia?.id ?? null,
          selectedAccounts,
          status,
          scheduleTime:
            status === "scheduled"
              ? new Date(scheduleTime).toISOString()
              : null,
        }),
      });

      await refreshPosts();
      setPost("");
      setScheduleTime("");
      setSelectedMedia(null);
      setSuccessMessage(status === "draft" ? "✅ Draft saved" : "✅ Scheduled");
    } catch (error) {
      console.error(error);
      alert("Save failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      <section
        id="draft"
        className="mt-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_40px_rgba(17,24,39,0.045)] sm:p-7 lg:p-8"
      >
        <div className="mb-6">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-600">
            Publishing studio
          </p>
          <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-[28px]">
            Create Post
          </h2>
        </div>

        <div className="space-y-5 sm:space-y-6">
          <textarea
            rows={5}
            value={post}
            onChange={(e) => setPost(e.target.value)}
            placeholder="Write your post..."
            aria-label="Post content"
            className="min-h-40 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-4 text-[15px] leading-6 text-slate-900 shadow-inner shadow-slate-950/[0.015] transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          />

          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5">
            <label
              htmlFor="post-schedule-time"
              className="mb-3 block text-sm font-bold text-slate-800"
            >
              Schedule Date &amp; Time
            </label>
            <input
              id="post-schedule-time"
              type="datetime-local"
              min={minScheduleTime}
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800">Publish to</p>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                {selectedAccounts.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {accounts.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-7 text-center">
                  <div className="mb-2 text-base font-bold text-slate-900">
                    No accounts connected
                  </div>
                  <p className="mx-auto mb-4 max-w-lg text-sm leading-6 text-slate-500">
                    Connect your Instagram, Facebook, LinkedIn, Pinterest or
                    Google Business Profile account before creating a post.
                  </p>
                  <button
                    onClick={() => router.push("/accounts?connect=true")}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#c7f36b] px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-[#9fda35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                  >
                    Connect Account
                  </button>
                </div>
              ) : (
                accounts.map((account) => {
                  const isSelected = selectedAccounts.includes(account.id);

                  return (
                    <label
                      key={account.id}
                      className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition duration-150 sm:p-4 ${
                        isSelected
                          ? "border-violet-300 bg-violet-50/70 shadow-[0_0_0_3px_rgba(109,93,252,0.07)]"
                          : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts([...selectedAccounts, account.id]);
                          } else {
                            setSelectedAccounts(
                              selectedAccounts.filter((id) => id !== account.id),
                            );
                          }
                        }}
                        className="h-4 w-4 shrink-0 accent-violet-600"
                      />

                      <div className="flex min-w-0 items-center gap-2.5">
                        {account.platform === "instagram" && (
                          <FaInstagram className="shrink-0 text-lg text-pink-500" />
                        )}
                        {account.platform === "facebook" && (
                          <FaFacebook className="shrink-0 text-lg text-blue-600" />
                        )}
                        {account.platform === "pinterest" && (
                          <FaPinterest className="shrink-0 text-lg text-red-500" />
                        )}
                        {account.platform === "linkedin" && (
                          <FaLinkedin className="shrink-0 text-lg text-blue-700" />
                        )}
                        {account.platform === "google-business" && (
                          <GoogleBusinessIcon size={20} />
                        )}
                        <span className="truncate text-sm font-bold text-slate-800">
                          {account.account_name}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-800">Media</label>
            <div className={styles.mediaPicker}>
              <MediaPicker value={selectedMedia} onChange={setSelectedMedia} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <button
              disabled={actionLoading !== null}
              onClick={() => savePost("draft")}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {actionLoading === "draft" ? "Saving..." : "Save Draft"}
            </button>

            <button
              disabled={actionLoading !== null}
              onClick={() => savePost("scheduled")}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#c7f36b] px-6 py-3 text-sm font-extrabold text-slate-950 shadow-[0_8px_18px_rgba(159,218,53,0.18)] transition hover:-translate-y-0.5 hover:bg-[#9fda35] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {actionLoading === "scheduled"
                ? "Scheduling..."
                : "Schedule Post"}
            </button>
          </div>

          {successMessage && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            >
              {successMessage}
            </div>
          )}
        </div>
      </section>

      <DraftPosts posts={posts} setPosts={setPosts} />

      <ScheduledPosts
        posts={posts}
        setPosts={setPosts}
        setSelectedPostId={setSelectedPostId}
        setSelectedTargets={setSelectedTargets}
        setShowTargetsModal={setShowTargetsModal}
      />

      <PublishDetailsModal
        open={showTargetsModal}
        onClose={() => setShowTargetsModal(false)}
        targets={selectedTargets}
        postId={selectedPostId}
        setTargets={setSelectedTargets}
      />
    </>
  );
}
