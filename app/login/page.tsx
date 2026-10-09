"use client";

import { signIn } from "next-auth/react";
import { Sparkles, CalendarDays, Layers3, RefreshCw, Users } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--dizito-canvas)]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT SIDE */}
        <div className="hidden lg:flex flex-col justify-center bg-[#171a22] p-10 text-white xl:p-16">
          <div className="max-w-lg">
            <div className="mb-8 inline-flex items-center gap-2 text-4xl font-extrabold tracking-tight"><span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--dizito-lime)] text-slate-900"><Sparkles size={23} /></span>Dizito</div>

            <h2 className="text-3xl font-semibold leading-tight mb-6">
              Schedule Instagram, Facebook, LinkedIn, Pinterest & Google Business Profile posts from one dashboard.
            </h2>

            <p className="text-lg text-blue-100 mb-10">
              Create once. Publish everywhere.
            </p>

            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[var(--dizito-lime)]">✓</span>
                <span>Multi-platform publishing</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xl">✓</span>
                <span>Bulk CSV upload</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xl">✓</span>
                <span>Smart retry system</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xl">✓</span>
                <span>Calendar scheduling</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xl">✓</span>
                <span>Multi-account management</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="text-center lg:hidden mb-10">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Dizito</h1>

              <p className="mt-4 text-gray-600">
                Schedule social media posts from one dashboard
              </p>
            </div>

            {/* Desktop Logo */}
            <div className="hidden lg:block mb-10">
              <h1 className="text-3xl font-bold">Welcome to Dizito</h1>

              <p className="mt-3 text-gray-500">
                Sign in or create your account using Google.
              </p>
            </div>

            <div className="dizito-card p-6 sm:p-8">
              <button
                onClick={() =>
                  signIn("google", {
                    callbackUrl: "/dashboard",
                  })
                }
                className="dizito-button dizito-button-secondary min-h-14 w-full rounded-2xl text-sm sm:text-base"
              >
                <svg width="22" height="22" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.5 39.6 16.2 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.4 5.6-6.2 7.2l6.2 5.2C39 37 44 31.1 44 24c0-1.3-.1-2.3-.4-3.5z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="mt-8 space-y-3 text-sm text-gray-600">
                <div>✓ No credit card required</div>

                <div>✓ Setup in under 2 minutes</div>

                <div>✓ Sign in & sign up with one click</div>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              By continuing, you agree to our{" "}
              <a href="/terms" className="font-semibold text-slate-900 underline decoration-violet-300 underline-offset-4">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="font-medium text-black">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
