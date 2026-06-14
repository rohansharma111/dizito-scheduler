"use client";
import { useState, useEffect } from "react";
import { Post } from "../types";
export default function CreatePostForm({ posts, setPosts }: any) {
  const [post, setPost] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [socialAccountId, setSocialAccountId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadAccounts() {
      const response = await fetch("/api/social-accounts");

      const data = await response.json();

      setAccounts(data);
    }

    loadAccounts();
  }, []);

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

        <select
          className="w-full border p-3 rounded"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option>Instagram</option>
          <option>Facebook</option>
          <option>LinkedIn</option>
          <option>X (Twitter)</option>
        </select>

        <input
          type="datetime-local"
          className="w-full border p-3 rounded"
          value={scheduleTime || ""}
          onChange={(e) => setScheduleTime(e.target.value)}
        />
        <select
          className="w-full border p-3 rounded"
          value={socialAccountId}
          onChange={(e) => setSocialAccountId(Number(e.target.value))}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.account_name}
            </option>
          ))}
        </select>
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
          disabled={loading}
          className={`px-6 py-3 rounded text-white ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"
          }`}
          onClick={async () => {
            if (!post.trim()) {
              alert("Please enter a post");
              return;
            }

            if (!scheduleTime) {
              alert("Please select a date and time");
              return;
            }

            setLoading(true);
            setSuccessMessage("");

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

              const response = await fetch("/api/posts", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  post,
                  platform,
                  scheduleTime: new Date(scheduleTime).toISOString(),
                  imageUrl,
                  socialAccountId,
                }),
              });

              await response.json();

              const postsResponse = await fetch("/api/posts");

              const latestPosts = await postsResponse.json();

              setPosts(latestPosts);

              setPost("");
              setPlatform("Instagram");
              setScheduleTime("");
              setImage(null);

              setSuccessMessage("✅ Post scheduled successfully");
            } catch (error) {
              console.error(error);

              alert("Failed to schedule post");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Saving..." : "Schedule Post"}
        </button>
        {successMessage && (
          <div className="text-green-600 font-medium">{successMessage}</div>
        )}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Scheduled Posts</h3>

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
              {posts.map((item: Post, index: number) => (
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
