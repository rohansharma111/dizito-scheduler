"use client";

import { signIn }
from "next-auth/react";

export default function LoginPage() {

  return (
    <div className="min-h-screen flex items-center justify-center">

      <div className="border p-8 rounded">

        <h1 className="text-3xl font-bold">
          Login
        </h1>

        <button
          onClick={() =>
            signIn(
              "google",
              {
                callbackUrl:
                  "/dashboard",
              }
            )
          }
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded"
        >
          Continue with Google
        </button>

      </div>

    </div>
  );
}