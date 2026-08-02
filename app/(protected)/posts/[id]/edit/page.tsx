"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaPinterest,
} from "react-icons/fa";

import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";

import MediaPicker from "@/components/media/MediaPicker";
import { MediaItem } from "@/types/media";

interface Account {
  id: number;
  account_name: string;
  platform: string;
}

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = params.id as string;

  const isView = searchParams.get("view") === "true";
  const scheduleMode = searchParams.get("schedule") === "true";

  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [post, setPost] = useState("");
  const [status, setStatus] = useState("");

  const [scheduleTime, setScheduleTime] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const [minScheduleTime, setMinScheduleTime] = useState("");

  useEffect(() => {
    const now = new Date();

    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

    setMinScheduleTime(local.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const [postResponse, accountResponse] = await Promise.all([
          fetch(`/api/posts/${id}`),
          fetch("/api/social-accounts"),
        ]);

        if (!postResponse.ok) {
          throw new Error("Failed to load post");
        }

        const postData = await postResponse.json();
        const accountData = await accountResponse.json();

        setAccounts(accountData.accounts ?? accountData);

        setPost(postData.post ?? "");

        setStatus(postData.status ?? "");

        setScheduleTime(
          postData.schedule_time
            ? new Date(postData.schedule_time).toISOString().slice(0, 16)
            : "",
        );

        setSelectedAccounts(
          postData.targets.map((t: any) => t.social_account_id),
        );

        if (postData.media_id) {
          setSelectedMedia(
            postData.media_id
              ? {
                  id: postData.media_id,
                  user_id: postData.media_user_id,

                  cloudinary_public_id: postData.cloudinary_public_id,
                  secure_url: postData.secure_url,

                  file_name: postData.file_name,
                  mime_type: postData.mime_type,

                  format: postData.format,
                  resource_type: postData.resource_type,

                  width: postData.width,
                  height: postData.height,

                  bytes: postData.bytes,

                  folder: postData.folder,
                  tags: postData.tags,

                  created_at: postData.media_created_at,
                  updated_at: postData.media_updated_at,
                  deleted_at: postData.deleted_at,
                }
              : null,
          );
        } else {
          setSelectedMedia(null);
        }
      } catch (error) {
        console.error(error);
        alert("Failed to load post");
      } finally {
        setPageLoading(false);
      }
    }

    load();
  }, [id]);

  async function save() {
    if (!post.trim()) {
      alert("Please enter a post");
      return;
    }

    if (selectedAccounts.length === 0) {
      alert("Select at least one account");
      return;
    }

    if ((status !== "draft" || scheduleMode) && !scheduleTime) {
      alert("Please select a schedule time");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          post,

          mediaId: selectedMedia?.id ?? null,

          selectedAccounts,

          scheduleTime: scheduleTime
            ? new Date(scheduleTime).toISOString()
            : null,

          scheduleMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return <div className="p-8">Loading post...</div>;
  }
  return (
    <div className="max-w-3xl mx-auto p-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-blue-600 hover:underline"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-6">
        {isView ? "View Post" : "Edit Campaign"}
      </h1>

      {isView && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-700">
          Viewing post in read-only mode.
        </div>
      )}

      {/* Caption */}

      <div className="mb-6">
        <label className="block font-bold mb-2">Caption</label>

        <textarea
          disabled={isView}
          rows={6}
          value={post}
          onChange={(e) => setPost(e.target.value)}
          className="w-full rounded border p-3"
        />
      </div>

      {/* Schedule */}

      {(status !== "draft" || scheduleMode) && (
        <div className="mb-6">
          <label className="block font-bold mb-2">Schedule</label>

          <input
            disabled={isView}
            type="datetime-local"
            value={scheduleTime}
            min={minScheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full rounded border p-3"
          />
        </div>
      )}

      {/* Accounts */}

      <div className="mb-6">
        <label className="block font-bold mb-3">Target Accounts</label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((account) => (
            <label
              key={account.id}
              className="border rounded-lg p-3 flex items-center gap-3"
            >
              <input
                disabled={isView}
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
                <div className="flex items-center gap-2">
                  {account.platform === "instagram" && (
                    <FaInstagram className="text-pink-500" />
                  )}

                  {account.platform === "facebook" && (
                    <FaFacebook className="text-blue-600" />
                  )}

                  {account.platform === "linkedin" && (
                    <FaLinkedin className="text-blue-700" />
                  )}

                  {account.platform === "pinterest" && (
                    <FaPinterest className="text-red-600" />
                  )}

                  {account.platform === "google-business" && (
                    <GoogleBusinessIcon size={20} />
                  )}

                  <span className="font-medium">{account.account_name}</span>
                </div>
              </div>
            </label>
          ))}
        </div>

        {selectedAccounts.length === 0 && (
          <p className="mt-2 text-sm text-red-500">
            Please select at least one target account.
          </p>
        )}
      </div>

      {/* Media */}

      <div className="mb-6">
        <label className="block font-bold mb-2">Media</label>

        <MediaPicker value={selectedMedia} onChange={setSelectedMedia} />
      </div>

      {/* Buttons */}

      {!isView ? (
        <div className="flex gap-3">
          <button
            disabled={loading}
            onClick={save}
            className={`px-6 py-3 rounded text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

          <button
            disabled={loading}
            onClick={() => router.back()}
            className="px-6 py-3 rounded border"
          >
            Cancel
          </button>
        </div>
      ) : (
        status !== "published" && (
          <button
            className="bg-yellow-500 text-white px-6 py-3 rounded hover:bg-yellow-600"
            onClick={() => router.push(`/posts/${id}/edit`)}
          >
            Edit Post
          </button>
        )
      )}
    </div>
  );
}
