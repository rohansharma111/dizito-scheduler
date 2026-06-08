"use client";
import { useState } from "react";
import { Post } from "../types";
export default function CreatePostForm({ posts, setPosts }: any) {
  const [post, setPost] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);

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
          className="bg-blue-600 text-white px-6 py-3 rounded"
          onClick={async () => {
            if (!post.trim()) {
              alert("Please enter a post");
              return;
            }

            if (!scheduleTime) {
              alert("Please select a date and time");
              return;
            }
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
                scheduleTime,
                imageUrl,
              }),
            });

            const data = await response.json();

            const postsResponse = await fetch("/api/posts");

            const latestPosts = await postsResponse.json();

            setPosts(latestPosts);
            alert("Saved to backend");
            console.log(data);

            setPost("");
            setPlatform("Instagram");
            setScheduleTime("");
          }}
        >
          Schedule Post
        </button>
        <button className="bg-green-600 text-white px-6 py-3 rounded">
          Post Now
        </button>
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
                    {item.schedule_time.replace("T", " ")}
                  </td>

                  <td className="border p-2">{item.status}</td>

                  <td className="border p-2">
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
