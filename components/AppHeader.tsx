"use client";

import { Bell, Search, User } from "lucide-react";

export default function AppHeader() {
  return (
    <header
      className="
        h-16
        bg-white
        border-b
        px-6
        flex
        items-center
        justify-between
        shrink-0
      "
    >
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search
            size={18}
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-gray-400
            "
          />

          <input
            placeholder="Search..."
            className="
              pl-10
              pr-4
              py-2
              w-72
              border
              rounded-lg
              outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">
        <button
          className="
            p-2
            rounded-lg
            hover:bg-gray-100
          "
        >
          <Bell size={20} />
        </button>

        <button
          className="
            p-2
            rounded-lg
            hover:bg-gray-100
          "
        >
          <User size={20} />
        </button>
      </div>
    </header>
  );
}
