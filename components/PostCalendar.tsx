"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function PostCalendar({
  posts,
}: any) {
  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const dayPosts = posts.filter(
    (post: any) => {
      const postDate = new Date(
        post.schedule_time
      );

      return (
        postDate.toDateString() ===
        selectedDate.toDateString()
      );
    }
  );

  return (
    <div className="bg-white p-6 rounded shadow my-6">
      <h2 className="text-2xl font-bold mb-4">
        Content Calendar
      </h2>

      <Calendar
        value={selectedDate}
        onChange={(date: any) =>
          setSelectedDate(date)
        }
        tileContent={({ date }) => {
          const count = posts.filter(
            (post: any) => {
              const postDate = new Date(
                post.schedule_time
              );

              return (
                postDate.toDateString() ===
                date.toDateString()
              );
            }
          ).length;

          return count > 0 ? (
            <div className="text-xs text-blue-600 font-bold">
              {count} posts
            </div>
          ) : null;
        }}
      />

      <div className="mt-6">
        <h3 className="text-xl font-bold mb-4">
          Posts For Selected Day
        </h3>

        {dayPosts.length === 0 ? (
          <div className="text-gray-500">
            No posts scheduled
          </div>
        ) : (
          dayPosts.map(
            (post: any) => (
              <div
                key={post.id}
                className="border p-3 rounded mb-3"
              >
                <div className="font-semibold">
                  {post.post}
                </div>

                <div className="text-sm text-gray-600">
                  {post.platform}
                </div>

                <div className="text-sm text-gray-600">
                  {new Date(
                    post.schedule_time
                  ).toLocaleString()}
                </div>

                <div className="mt-1">
                  {post.status ===
                    "published" && (
                    <span className="text-green-600 font-semibold">
                      Published
                    </span>
                  )}

                  {post.status ===
                    "scheduled" && (
                    <span className="text-blue-600 font-semibold">
                      Scheduled
                    </span>
                  )}

                  {post.status ===
                    "failed" && (
                    <span className="text-red-600 font-semibold">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}