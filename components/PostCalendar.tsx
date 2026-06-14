"use client";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function PostCalendar({
  posts,
}: any) {
  return (
    <div className="bg-white p-6 rounded shadow my-6">
      <h2 className="text-2xl font-bold mb-4">
        Content Calendar
      </h2>

      <Calendar
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
            <div className="text-xs">
              {count} posts
            </div>
          ) : null;
        }}
      />
    </div>
  );
}