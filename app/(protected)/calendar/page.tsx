import PostCalendar from "@/components/PostCalendar";
import { Post } from "../../../types";
import { useState } from "react";

export default function CalendarPage() {
  const [posts] = useState<Post[]>([]);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>

      <PostCalendar posts={posts} />
    </div>
  );
}
