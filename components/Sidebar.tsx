"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const linkClass = (
    href: string
  ) =>
    `block px-3 py-2 rounded ${
      pathname === href
        ? "bg-blue-600 text-white"
        : "hover:bg-gray-100"
    }`;

  return (
    <aside className="w-64 border-r bg-white p-4">
      <h1 className="text-2xl font-bold mb-8">
        Dizito
      </h1>

      <nav className="space-y-2">
        <Link
          href="/dashboard"
          className={linkClass(
            "/dashboard"
          )}
        >
          Dashboard
        </Link>

        <Link
          href="/accounts"
          className={linkClass(
            "/accounts"
          )}
        >
          Accounts
        </Link>
      </nav>
    </aside>
  );
}