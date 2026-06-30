"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function PostCalendar({ posts }: any) {
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

  const upcomingPosts = [...posts]
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
      <div className="bg-white p-4 rounded-xl shadow my-6">
        <h2 className="text-xl font-bold mb-4">Upcoming Posts</h2>

        {upcomingPosts.length === 0 ? (
          <div className="text-gray-500">No scheduled posts</div>
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
                <div className="font-semibold">{post.post}</div>

                <div className="mt-2 text-sm text-gray-500">
                  {new Date(post.schedule_time).toLocaleString()}
                </div>

                <div className="mt-2 flex gap-2">
                  <span
                    className="
                      px-2
                      py-1
                      bg-gray-100
                      rounded
                      text-xs
                    "
                  >
                    {post.platform}
                  </span>
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
    <div className="bg-white p-6 rounded-xl shadow my-6">
      <h2 className="text-2xl font-bold mb-4">Content Calendar</h2>

      <div className="overflow-x-auto">
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
        <h3 className="text-xl font-bold mb-4">Posts For Selected Day</h3>

        {dayPosts.length === 0 ? (
          <div className="text-gray-500">No posts scheduled</div>
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
