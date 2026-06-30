"use client";

import { useEffect, useState } from "react";

import DraftPosts from "./DraftPosts";
import ScheduledPosts from "./ScheduledPosts";
import PublishDetailsModal from "./PublishDetailsModal";

export default function CreatePostForm({ posts, setPosts }: any) {
  const [post, setPost] = useState("");

  const [scheduleTime, setScheduleTime] = useState("");

  const [image, setImage] = useState<File | null>(null);

  const [accounts, setAccounts] = useState<any[]>([]);

  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);

  const [actionLoading, setActionLoading] = useState<
    "draft" | "scheduled" | null
  >(null);

  const [successMessage, setSuccessMessage] = useState("");

  const [selectedTargets, setSelectedTargets] = useState<any[]>([]);

  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const [showTargetsModal, setShowTargetsModal] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      const response = await fetch("/api/social-accounts");

      const data = await response.json();

      setAccounts(data);
    }

    loadAccounts();
  }, []);

  const minScheduleTime = (() => {
    const now = new Date();

    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

    return local.toISOString().slice(0, 16);
  })();

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
      let imageUrl = "";

      if (image) {
        const formData = new FormData();

        formData.append("file", image);

        const upload = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await upload.json();

        imageUrl = data.url;
      }

      await fetch("/api/posts", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          post,
          imageUrl,
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
      setImage(null);

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
      <div
        className="
          bg-white
          rounded-xl
          shadow
          p-4
          md:p-6
          mt-6
        "
      >
        <h2
          className="
            text-2xl
            font-bold
            mb-6
          "
        >
          Create Post
        </h2>

        <div
          className="
            space-y-4
          "
        >
          <textarea
            rows={5}
            value={post}
            onChange={(e) => setPost(e.target.value)}
            placeholder="Write your post..."
            className="
              w-full
              border
              rounded-lg
              p-3
            "
          />

          <div>
            <label className="block mb-2 font-medium">
              Schedule Date & Time
            </label>
            <input
              type="datetime-local"
              min={minScheduleTime}
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="
              w-full
              border
              rounded-lg
              p-3
            "
            />
          </div>

          <div
            className="
              border
              rounded-lg
              p-4
            "
          >
            <h4
              className="
                font-medium
                mb-3
              "
            >
              Select Accounts
            </h4>

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-3
              "
            >
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className="
                      border
                      rounded-lg
                      p-3
                      flex
                      items-center
                      gap-3
                    "
                >
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(account.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAccounts([...selectedAccounts, account.id]);
                      } else {
                        setSelectedAccounts(
                          selectedAccounts.filter((id) => id !== account.id),
                        );
                      }
                    }}
                  />

                  <div>
                    <div>{account.account_name}</div>

                    <div
                      className="
                          text-sm
                          text-gray-500
                        "
                    >
                      {account.platform}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <input
            className="
              w-full
            "
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setImage(e.target.files[0]);
              }
            }}
          />

          <div
            className="
              flex
              flex-col
              md:flex-row
              gap-3
            "
          >
            <button
              disabled={actionLoading !== null}
              onClick={() => savePost("draft")}
              className="
                w-full
                md:w-auto
                bg-gray-600
                text-white
                px-6
                py-3
                rounded-lg
              "
            >
              {actionLoading === "draft" ? "Saving..." : "Save Draft"}
            </button>

            <button
              disabled={actionLoading !== null}
              onClick={() => savePost("scheduled")}
              className="
                w-full
                md:w-auto
                bg-blue-600
                text-white
                px-6
                py-3
                rounded-lg
              "
            >
              {actionLoading === "scheduled"
                ? "Scheduling..."
                : "Schedule Post"}
            </button>
          </div>

          {successMessage && (
            <div className="text-green-600">{successMessage}</div>
          )}
        </div>
      </div>

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
