"use client";

import { Bell, Search, User, Menu } from "lucide-react";
import Link from "next/link";

export default function AppHeader({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  return (
    <header
      className="
        h-16
        bg-white
        border-b
        px-4
        md:px-6
        flex
        items-center
        justify-between
        shrink-0
      "
    >
      {/* LEFT */}
      <div className="flex items-center gap-4">
        {/* MOBILE MENU */}
        <button
          onClick={onMenuClick}
          className="
            lg:hidden
            p-2
            rounded-lg
            hover:bg-gray-100
          "
        >
          <Menu size={22} />
        </button>

        {/* MOBILE LOGO */}
        <Link
          href="/dashboard"
          className="
    font-bold
    text-lg
    lg:hidden
    hover:text-blue-600
    transition-colors
  "
        >
          Dizito
        </Link>

        {/* DESKTOP SEARCH */}
        <div className="relative hidden md:block">
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
      <div className="flex items-center gap-2 md:gap-5">
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
