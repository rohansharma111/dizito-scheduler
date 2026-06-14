"use client";

import {
  useEffect,
  useState,
} from "react";

export default function EditPostPage({
  params,
}: any) {

  const [post,
    setPost] =
    useState("");

  const [scheduleTime,
    setScheduleTime] =
    useState("");

  useEffect(() => {

    fetch(
      `/api/posts/${params.id}`
    )
      .then((res) =>
        res.json()
      )
      .then((data) => {

        setPost(
          data.post
        );

        setScheduleTime(
          data.schedule_time
            ?.slice(0, 16)
        );

      });

  }, [params.id]);

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
          setPost(
            e.target.value
          )
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
        className="bg-blue-600 text-white px-6 py-3 rounded mt-4"
        onClick={async () => {

          await fetch(
            `/api/posts/${params.id}`,
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
                    scheduleTime,
                }),
            }
          );

          window.location.href =
            "/dashboard";

        }}
      >
        Save Changes
      </button>

    </div>

  );

}