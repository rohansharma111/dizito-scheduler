"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function EditPostPage() {
  const params = useParams();

  const id = params.id as string;

  const [post, setPost] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadPost() {
      const response = await fetch(
        `/api/posts/${id}`
      );

      const data =
        await response.json();

      setPost(data.post);

      setScheduleTime(
        data.schedule_time?.slice(0, 16)
      );
    }

    loadPost();
  }, [id]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Edit Post
      </h1>

      <textarea
        className="w-full border p-3 rounded"
        rows={6}
        value={post}
        onChange={(e) =>
          setPost(e.target.value)
        }
      />

      <input
        type="datetime-local"
        className="w-full border p-3 rounded mt-4"
        value={scheduleTime}
        onChange={(e) =>
          setScheduleTime(
            e.target.value
          )
        }
      />

      <button
        disabled={loading}
        className={`px-6 py-3 rounded text-white mt-4 ${
          loading
            ? "bg-gray-400"
            : "bg-blue-600"
        }`}
        onClick={async () => {
          setLoading(true);

          try {
            const response =
              await fetch(
                `/api/posts/${id}`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body:
                    JSON.stringify({
                      post,
                      schedule_time:
                        new Date(
                          scheduleTime
                        ).toISOString(),
                    }),
                }
              );

            const data =
              await response.json();

            if (!response.ok) {
              alert(
                data.error ||
                  "Failed to update post"
              );
              return;
            }

            window.location.href =
              "/dashboard";
          } catch (error) {
            console.error(error);
            alert(
              "Failed to update post"
            );
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading
          ? "Saving..."
          : "Save Changes"}
      </button>
    </div>
  );
}