"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface Account {
  id: number;
  account_name: string;
  platform: string;
}

export default function EditPostPage() {
  const params = useParams();
  const id = params.id as string;

  const searchParams = useSearchParams();
  const scheduleMode = searchParams.get("schedule") === "true";

  const [post, setPost] = useState("");

  const [status, setStatus] = useState("");

  const [scheduleTime, setScheduleTime] = useState("");

  const [imageUrl, setImageUrl] = useState("");

  const [image, setImage] = useState<File | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);

  const minScheduleTime = (() => {
    const now = new Date();

    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

    return local.toISOString().slice(0, 16);
  })();

  const isView = searchParams.get("view") === "true";

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const [postResponse, accountResponse] = await Promise.all([
          fetch(`/api/posts/${id}`),
          fetch("/api/accounts"),
        ]);

        const postData = await postResponse.json();

        const accountData = await accountResponse.json();

        setAccounts(accountData);

        setPost(postData.post || "");

        setStatus(postData.status || "");

        setImageUrl(postData.image_url || "");

        setScheduleTime(
          postData.schedule_time ? postData.schedule_time.slice(0, 16) : "",
        );

        setSelectedAccounts(
          postData.targets.map((t: any) => t.social_account_id),
        );
      } catch (error) {
        console.error(error);

        alert("Failed to load post");
      } finally {
        setPageLoading(false);
      }
    }

    load();
  }, [id]);

  if (pageLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">
        {isView ? "View Post" : "Edit Campaign"}
      </h1>
      {isView && (
        <div
          className="
      mb-6
      bg-blue-50
      border
      border-blue-200
      text-blue-700
      rounded-lg
      p-4
    "
        >
          Viewing post in read-only mode.
        </div>
      )}

      {/* POST */}

      <div className="mb-6">
        <label className="font-bold">Caption</label>

        <textarea
          disabled={isView}
          rows={6}
          className="w-full border p-3 rounded mt-2"
          value={post}
          onChange={(e) => setPost(e.target.value)}
        />
      </div>

      {/* IMAGE */}

      <div className="mb-6">
        <label className="font-bold">Image</label>

        {imageUrl && (
          <img src={imageUrl} className="w-48 rounded border mt-2 mb-3" />
        )}

        <input
          disabled={isView}
          type="file"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />
      </div>

      {/* TARGETS */}

      <div className="mb-6">
        <label className="font-bold">Targets</label>

        <div className="mt-3 space-y-2">
          {accounts.map((account) => (
            <label key={account.id} className="flex gap-3">
              <input
                disabled={isView}
                type="checkbox"
                checked={selectedAccounts.includes(account.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedAccounts([...selectedAccounts, account.id]);
                  } else {
                    setSelectedAccounts(
                      selectedAccounts.filter((x) => x !== account.id),
                    );
                  }
                }}
              />

              <span>
                {account.platform}
                {" - "}
                {account.account_name}
              </span>
            </label>
          ))}
        </div>
      </div>
      {selectedAccounts.length === 0 && (
        <p className="text-red-500 text-sm mt-2">
          Please select at least one target account
        </p>
      )}
      {/* SCHEDULE */}

      {(status !== "draft" || scheduleMode) && (
        <div className="mb-6">
          <label className="font-bold">Schedule</label>

          <input
            disabled={isView}
            type="datetime-local"
            className="w-full border p-3 rounded mt-2"
            min={minScheduleTime}
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
          />
        </div>
      )}

      {/* SAVE */}

      {!isView && (
        <button
          disabled={loading || selectedAccounts.length === 0}
          className={`
      px-6
      py-3
      rounded
      text-white
      ${
        loading || selectedAccounts.length === 0
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-blue-600"
      }
    `}
          onClick={async () => {
            if (!post.trim()) {
              alert("Please enter a post");
              return;
            }

            if (selectedAccounts.length === 0) {
              alert("Please select at least one target account");
              return;
            }

            if ((status !== "draft" || scheduleMode) && !scheduleTime) {
              alert("Please select a schedule time");
              return;
            }
            setLoading(true);

            try {
              let uploadedImage = imageUrl;

              if (image) {
                const formData = new FormData();

                formData.append("file", image);

                const upload = await fetch("/api/upload", {
                  method: "POST",
                  body: formData,
                });

                const uploadData = await upload.json();

                uploadedImage = uploadData.url;
              }

              const response = await fetch(`/api/posts/${id}`, {
                method: "PUT",

                headers: {
                  "Content-Type": "application/json",
                },

                body: JSON.stringify({
                  post,
                  image_url: uploadedImage,

                  social_account_ids: selectedAccounts,

                  schedule_time: scheduleTime
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

              window.location.href = "/dashboard";
            } catch (error) {
              console.error(error);

              alert("Failed to save");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      )}

      {isView && status !== "published" && (
        <button
          className="
      bg-yellow-500
      text-white
      px-6
      py-3
      rounded
    "
          onClick={() => {
            window.location.href = `/posts/${id}/edit`;
          }}
        >
          Edit Post
        </button>
      )}
    </div>
  );
}
