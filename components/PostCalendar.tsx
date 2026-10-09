"use client";

import { Post } from "@/types";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaInstagram, FaFacebook, FaLinkedin, FaPinterest } from "react-icons/fa";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";

export default function PostCalendar({ posts }: { posts: Post[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setMobile(window.innerWidth < 768);
    };

    check();

    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, []);

  const dayPosts = posts.filter((post: any) => {
    const postDate = new Date(post.schedule_time);

    return postDate.toDateString() === selectedDate.toDateString();
  });

  const now = new Date();

  const upcomingPosts = posts
    .filter(
      (post) =>
        ["scheduled", "processing"].includes(post.status) &&
        post.schedule_time &&
        new Date(post.schedule_time) >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.schedule_time).getTime() -
        new Date(b.schedule_time).getTime(),
    )
    .slice(0, 20);

  function renderStatus(status: string) {
    switch (status) {
      case "published":
        return <span className="text-green-600 font-semibold">Published</span>;

      case "scheduled":
        return <span className="text-blue-600 font-semibold">Scheduled</span>;

      case "failed":
        return <span className="text-red-600 font-semibold">Failed</span>;

      case "draft":
        return <span className="text-gray-500 font-semibold">Draft</span>;

      default:
        return <span className="text-gray-500">{status}</span>;
    }
  }

  /*
    MOBILE VIEW
  */
  if (mobile) {
    return (
      <div className="my-4 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:my-6 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 sm:text-xl">Upcoming Posts</h2>

        {upcomingPosts.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No scheduled posts</div>
        ) : (
          <div className="space-y-4">
            {upcomingPosts.map((post: any) => (
              <div
                key={post.id}
                className="
                    border
                    rounded-xl
                    p-4
                    shadow-sm
                  "
              >
                <div className="break-words font-semibold text-slate-900">{post.post}</div>

                <div className="mt-2 text-sm text-gray-500">
                  {new Date(post.schedule_time).toLocaleString()}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {post.targets?.map((target: any) => (
                    <div key={target.id}>
                      {target.platform === "instagram" && (
                        <FaInstagram
                          className="
            text-pink-500
            text-xl
          "
                        />
                      )}

                      {target.platform === "facebook" && (
                        <FaFacebook
                          className="
            text-blue-600
            text-xl
          "
                        />
                      )}

                      {target.platform === "linkedin" && (
                        <FaLinkedin
                          className="
            text-blue-700
            text-xl
          "
                        />
                      )}

                      {target.platform === "pinterest" && (
                        <FaPinterest
                          className="
            text-red-600
            text-xl
          "
                        />
                      )}

                      {target.platform === "google-business" && (
                        <GoogleBusinessIcon
                          className="
            text-green-600
            text-xl
          "
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3">{renderStatus(post.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /*
    DESKTOP VIEW
  */
  return (
    <div className="my-4 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:my-6 sm:p-6">
      <h2 className="mb-4 text-xl font-semibold text-slate-900 sm:text-2xl">Content Calendar</h2>

      <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-100 p-2 sm:p-3">
        <Calendar
          value={selectedDate}
          onChange={(date: any) => setSelectedDate(date)}
          tileContent={({ date }) => {
            const count = posts.filter((post: any) => {
              const postDate = new Date(post.schedule_time);

              return postDate.toDateString() === date.toDateString();
            }).length;

            return count > 0 ? (
              <div className="text-xs text-blue-600 font-bold">
                {count} posts
              </div>
            ) : null;
          }}
        />
      </div>

      <div className="mt-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 sm:text-xl">Posts For Selected Day</h3>

        {dayPosts.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No posts scheduled for this day</div>
        ) : (
          dayPosts.map((post: any) => (
            <div
              key={post.id}
              className="
                  border
                  rounded-lg
                  p-4
                  mb-3
                "
            >
              <div className="font-semibold">{post.post}</div>

              <div className="text-sm text-gray-600 mt-1">{post.platform}</div>

              <div className="text-sm text-gray-600">
                {new Date(post.schedule_time).toLocaleString()}
              </div>

              <div className="mt-2">{renderStatus(post.status)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
