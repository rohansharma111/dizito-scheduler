"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 min-h-screen border-r p-4">

      <h1 className="text-2xl font-bold mb-8">
        Dizito
      </h1>

      <div className="space-y-3">

        <Link href="/dashboard">
          Dashboard
        </Link>

        <br />

        <Link href="/posts">
          Posts
        </Link>

        <br />

        <Link href="/drafts">
          Drafts
        </Link>

        <br />

        <Link href="/calendar">
          Calendar
        </Link>

        <br />

        <Link href="/accounts">
          Accounts
        </Link>

      </div>

    </div>
  );
}