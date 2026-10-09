"use client";

import { Post } from "@/types";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaPinterest,
} from "react-icons/fa";
import { CalendarDays, Clock3, FileText } from "lucide-react";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";
import styles from "./PostCalendar.module.css";

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
    const classes =
      status === "published"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : status === "scheduled" || status === "processing"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : status === "failed"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-slate-200 bg-slate-100 text-slate-600";

    const label =
      status === "published"
        ? "Published"
        : status === "scheduled"
          ? "Scheduled"
          : status === "failed"
            ? "Failed"
            : status === "draft"
              ? "Draft"
              : status;

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}
      >
        {label}
      </span>
    );
  }

  function renderPlatformIcon(platform: string, size = "text-lg") {
    if (platform === "instagram") {
      return <FaInstagram className={`shrink-0 ${size} text-pink-500`} />;
    }
    if (platform === "facebook") {
      return <FaFacebook className={`shrink-0 ${size} text-blue-600`} />;
    }
    if (platform === "linkedin") {
      return <FaLinkedin className={`shrink-0 ${size} text-blue-700`} />;
    }
    if (platform === "pinterest") {
      return <FaPinterest className={`shrink-0 ${size} text-red-600`} />;
    }
    if (platform === "google-business") {
      return <GoogleBusinessIcon size={20} />;
    }
    return null;
  }

  if (mobile) {
    return (
      <div className="min-w-0 space-y-4">
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-600">
            Publishing
          </p>
          <h2 className="text-xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-2xl">
            Upcoming Posts
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Your next scheduled posts, all in one place.
          </p>
        </div>

        {upcomingPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <CalendarDays size={21} />
            </span>
            <p className="text-sm font-bold text-slate-800">No scheduled posts</p>
            <p className="mt-1 text-sm text-slate-500">
              Scheduled content will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingPosts.map((post: any) => (
              <article
                key={post.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(17,24,39,0.035)] transition hover:border-violet-200"
              >
                <div className="break-words text-sm font-bold leading-6 text-slate-900">
                  {post.post}
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Clock3 size={14} className="shrink-0" />
                  {new Date(post.schedule_time).toLocaleString()}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {post.targets?.map((target: any) => (
                    <span
                      key={target.id}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50"
                      title={target.platform}
                    >
                      {renderPlatformIcon(target.platform)}
                    </span>
                  ))}
                </div>

                <div className="mt-3">{renderStatus(post.status)}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-600">
            Publishing
          </p>
          <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-[28px]">
            Content Calendar
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Select a day to review its scheduled and published content.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
          <FileText size={14} className="text-violet-600" />
          {posts.length} {posts.length === 1 ? "post" : "posts"} total
        </span>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/55 p-3 sm:p-5">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-200/70">
              <CalendarDays size={17} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Month view</h3>
              <p className="text-xs text-slate-500">Choose a day</p>
            </div>
          </div>

          <div className={styles.calendarFrame}>
            <Calendar
              className={styles.calendar}
              value={selectedDate}
              onChange={(date: any) => setSelectedDate(date)}
              tileContent={({ date }) => {
                const count = posts.filter((post: any) => {
                  const postDate = new Date(post.schedule_time);
                  return postDate.toDateString() === date.toDateString();
                }).length;

                return count > 0 ? (
                  <span className={styles.postCount}>
                    {count} {count === 1 ? "post" : "posts"}
                  </span>
                ) : null;
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200/80 px-1 pt-4 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Selected day
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime-500" />
              Today
            </span>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-violet-600">
                Day overview
              </p>
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-950 sm:text-xl">
                Posts For Selected Day
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 px-2 text-sm font-extrabold text-violet-700">
              {dayPosts.length}
            </span>
          </div>

          {dayPosts.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/70">
                <CalendarDays size={21} />
              </span>
              <p className="text-sm font-bold text-slate-800">
                No posts for this day
              </p>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                Choose another date to see its content, or schedule a post for this day.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayPosts.map((post: any) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(17,24,39,0.035)] transition hover:border-violet-200 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 break-words text-sm font-bold leading-6 text-slate-900 sm:text-base">
                      {post.post}
                    </div>
                    {renderStatus(post.status)}
                  </div>

                  {post.platform && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold capitalize text-slate-500">
                      {renderPlatformIcon(post.platform, "text-base")}
                      {post.platform}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Clock3 size={14} className="shrink-0" />
                    {new Date(post.schedule_time).toLocaleString()}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
