"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      className="mt-3 text-red-600"
      onClick={() => signOut()}
    >
      Logout
    </button>
  );
}