"use client";
import { useState, useEffect } from "react";
import { Post } from "../types";
export default function CreatePostForm({ posts, setPosts }: any) {
  const [post, setPost] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<
    "draft" | "scheduled" | null
  >(null);
  const minScheduleTime = (() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  })();
  const [socialAccountId, setSocialAccountId] = useState<number | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadAccounts() {
      const response = await fetch("/api/social-accounts");

      const data = await response.json();

      setAccounts(data);
      if (data.length > 0) {
        setSocialAccountId(data[0].id);
      }
    }

    loadAccounts();
  }, []);
  async function savePost(status: "scheduled" | "draft") {
    if (!post.trim()) {
      alert("Please enter a post");
      return;
    }

    if (status === "scheduled" && !scheduleTime) {
      alert("Please select a date and time");
      return;
    }

    if (selectedAccounts.length === 0) {
      alert("Select at least one account");

      return;
    }

    setLoading(true);
    setSuccessMessage("");
    setActionLoading(status);
    try {
      let imageUrl = "";

      if (image) {
        const formData = new FormData();

        formData.append("file", image);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        imageUrl = uploadData.url;
      }

      await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post,
          scheduleTime:
            status === "scheduled"
              ? new Date(scheduleTime).toISOString()
              : null,
          imageUrl,
          selectedAccounts,
          status,
        }),
      });

      const postsResponse = await fetch("/api/posts");

      const latestPosts = await postsResponse.json();

      setPosts(latestPosts);

      setPost("");
      setPlatform("Instagram");
      setScheduleTime("");
      setImage(null);

      setSuccessMessage(
        status === "draft"
          ? "✅ Draft saved successfully"
          : "✅ Post scheduled successfully",
      );
    } catch (error) {
      console.error(error);

      alert(
        status === "draft" ? "Failed to save draft" : "Failed to schedule post",
      );
    } finally {
      setActionLoading(null);
    }
  }
  return (
    <div className="bg-white p-6 rounded shadow mt-8">
      <h2 className="text-2xl font-bold mb-4">Create Post</h2>

      <div className="space-y-4">
        <textarea
          placeholder="Write your post..."
          className="w-full border p-3 rounded"
          rows={5}
          value={post}
          onChange={(e) => setPost(e.target.value)}
        />

        <input
          type="datetime-local"
          className="w-full border p-3 rounded"
          min={minScheduleTime}
          value={scheduleTime || ""}
          onChange={(e) => setScheduleTime(e.target.value)}
        />
        <div className="border p-3 rounded">
          <h4 className="font-medium mb-2">Select Accounts</h4>

          {accounts.map((account) => (
            <label key={account.id} className="flex items-center gap-2 mb-2">
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

              <span>{account.account_name}</span>

              <span className="text-gray-500">({account.platform})</span>
            </label>
          ))}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setImage(e.target.files[0]);
            }
          }}
        />

        <button
          disabled={actionLoading !== null}
          className="bg-gray-600 text-white px-6 py-3 rounded"
          onClick={() => savePost("draft")}
        >
          {actionLoading === "draft" ? "Saving Draft..." : "Save Draft"}
        </button>

        <button
          disabled={actionLoading !== null}
          className="px-6 py-3 rounded text-white bg-blue-600"
          onClick={() => savePost("scheduled")}
        >
          {actionLoading === "scheduled" ? "Scheduling..." : "Schedule Post"}
        </button>

        {successMessage && (
          <div className="text-green-600 font-medium">{successMessage}</div>
        )}

        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Draft Posts</h3>

          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Post</th>
                <th className="border p-2">Targets</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {posts
                .filter(
                  (item: Post) =>
                    item.status === "draft" && item.schedule_time == null,
                )
                .map((item: Post, index: number) => (
                  <tr key={index}>
                    <td className="border p-2">{item.post}</td>

                    <td>
                      <div className="space-y-1">
                        {item.targets?.map((target) => (
                          <div key={target.id}>
                            {target.platform}{" "}
                            {target.status === "published" && "✅"}
                            {target.status === "scheduled" && "⏳"}
                            {target.status === "processing" && "🔄"}
                            {target.status === "failed" && "❌"}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="border p-2">
                      <button
                        className="bg-yellow-500 text-white px-3 py-1 rounded ml-2"
                        onClick={() => {
                          window.location.href = `/posts/${item.id}/edit`;
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded"
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

                          const response = await fetch("/api/posts");

                          const latestPosts = await response.json();

                          setPosts(latestPosts);
                        }}
                      >
                        Delete
                      </button>

                      <button
                        className="bg-green-600 text-white px-3 py-1 rounded ml-2"
                        onClick={async () => {
                          await fetch(`/api/posts/${item.id}/duplicate`, {
                            method: "POST",
                          });

                          window.location.reload();
                        }}
                      >
                        Duplicate
                      </button>
                      <button
                        className="bg-blue-600 text-white px-3 py-1 rounded ml-2"
                        onClick={() => {
                          window.location.href = `/posts/${item.id}/edit?schedule=true`;
                        }}
                      >
                        Schedule
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">
            Scheduled / Published Posts
          </h3>

          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Post</th>
                <th className="border p-2">Platform</th>
                <th className="border p-2">Time</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {posts
                .filter((item: Post) => item.status !== "draft")
                .map((item: Post, index: number) => (
                  <tr key={index}>
                    <td className="border p-2">{item.post}</td>

                    <td className="border p-2">{item.platform}</td>

                    <td className="border p-2">
                      {new Date(item.schedule_time).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>

                    <td className="border p-2">
                      {item.status === "published" && (
                        <span className="text-green-600">Published</span>
                      )}

                      {item.status === "scheduled" && (
                        <span className="text-blue-600">Scheduled</span>
                      )}
                      {item.status === "draft" && (
                        <span className="text-gray-500">Draft</span>
                      )}
                      {item.status === "processing" && (
                        <span className="text-green-600">Processing</span>
                      )}

                      {item.status === "failed" && (
                        <span className="text-red-600">Failed</span>
                      )}

                      {item.status === "failed" && (
                        <button
                          className="ml-2 bg-yellow-500 text-white px-2 py-1 rounded"
                          onClick={async () => {
                            await fetch(`/api/posts/retry`, {
                              method: "POST",

                              headers: {
                                "Content-Type": "application/json",
                              },

                              body: JSON.stringify({
                                id: item.id,
                              }),
                            });

                            const response = await fetch("/api/posts");

                            const latestPosts = await response.json();

                            setPosts(latestPosts);
                          }}
                        >
                          Retry
                        </button>
                      )}
                      {item.publish_message && (
                        <button
                          className="ml-2 bg-gray-500 text-white px-2 py-1 rounded"
                          onClick={() => {
                            alert(item.publish_message);
                          }}
                        >
                          View Error
                        </button>
                      )}
                    </td>

                    <td className="border p-2">
                      {["scheduled", "failed", "draft"].includes(
                        item.status,
                      ) && (
                        <button
                          className="bg-yellow-500 text-white px-3 py-1 rounded ml-2"
                          onClick={() => {
                            window.location.href = `/posts/${item.id}/edit`;
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {item.status !== "processing" && (
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded"
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

                            const response = await fetch("/api/posts");

                            const latestPosts = await response.json();

                            setPosts(latestPosts);
                          }}
                        >
                          Delete
                        </button>
                      )}
                      {item.status !== "published" && (
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded ml-2"
                          onClick={async () => {
                            await fetch(`/api/posts/${item.id}/duplicate`, {
                              method: "POST",
                            });

                            window.location.reload();
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
      </div>
    </div>
  );
}
