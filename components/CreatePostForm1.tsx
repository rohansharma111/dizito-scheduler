"use client";
import { useState, useEffect } from "react";
import { Post } from "../types";
import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";
export default function CreatePostForm1({ posts, setPosts }: any) {
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
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
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
    <>
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

                      <td className="border p-2">
                        <div className="flex items-center gap-3">
                          {item.targets?.map((target) => (
                            <div
                              key={target.id}
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
                  <th className="border p-2">Targets</th>
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

                        <button
                          className="bg-gray-700 text-white px-3 py-1 rounded ml-2"
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
      {showTargetsModal && (
        <div
          className="
      fixed inset-0
      bg-black/50
      flex
      items-center
      justify-center
      z-50
    "
          onClick={() => setShowTargetsModal(false)}
        >
          <div
            className="
        bg-white
        rounded-lg
        p-6
        w-[600px]
        max-h-[80vh]
        overflow-y-auto
      "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Publish Details</h2>

                <div className="text-sm text-gray-500 mt-1">
                  {
                    selectedTargets.filter((t: any) => t.status === "published")
                      .length
                  }{" "}
                  Published •{" "}
                  {
                    selectedTargets.filter((t: any) => t.status === "failed")
                      .length
                  }{" "}
                  Failed • {selectedTargets.length} Platforms
                </div>
              </div>

              <button
                className="text-xl"
                onClick={() => setShowTargetsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {selectedTargets.map((target: any) => (
                <div
                  key={target.id}
                  className="
                border
                rounded-lg
                p-4
                flex
                justify-between
                items-start
              "
                >
                  <div className="flex items-start gap-3">
                    {target.platform === "instagram" && (
                      <FaInstagram className="text-pink-500 text-2xl mt-1" />
                    )}

                    {target.platform === "facebook" && (
                      <FaFacebook className="text-blue-600 text-2xl mt-1" />
                    )}

                    {target.platform === "linkedin" && (
                      <FaLinkedin className="text-blue-700 text-2xl mt-1" />
                    )}

                    <div>
                      <div className="font-semibold">{target.account_name}</div>

                      <div className="text-sm text-gray-500 capitalize">
                        {target.platform}
                      </div>

                      {target.published_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Published:{" "}
                          {new Date(target.published_at).toLocaleString(
                            "en-IN",
                            {
                              timeZone: "Asia/Kolkata",
                            },
                          )}
                        </div>
                      )}

                      {target.publish_message && (
                        <div className="mt-2 text-sm text-red-500 break-words max-w-[350px]">
                          {target.publish_message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {target.status === "published" && (
                      <span className="text-green-600 font-medium">
                        ✅ Published
                      </span>
                    )}

                    {target.status === "scheduled" && (
                      <span className="text-blue-600 font-medium">
                        ⏳ Scheduled
                      </span>
                    )}

                    {target.status === "processing" && (
                      <span className="text-yellow-600 font-medium">
                        🔄 Processing
                      </span>
                    )}

                    {target.status === "failed" && (
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-red-600 font-medium">
                          ❌ Failed
                        </span>

                        <button
                          className="
        bg-yellow-500
        text-white
        px-3
        py-1
        rounded
      "
                          onClick={async () => {
                            const response = await fetch(
                              `/api/post-targets/${target.id}/retry`,
                              {
                                method: "POST",
                              },
                            );

                            const data = await response.json();

                            if (!response.ok) {
                              alert(data.error || "Retry failed");
                              return;
                            }

                            const refresh = await fetch(
                              `/api/posts/${selectedPostId}/targets`,
                            );

                            const latestTargets = await refresh.json();

                            setSelectedTargets(latestTargets);

                            alert("Queued for retry");
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
