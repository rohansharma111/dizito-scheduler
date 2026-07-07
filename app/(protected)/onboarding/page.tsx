"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Progress = {
  connectedAccounts: number;
  postsCreated: number;
  postsScheduled: number;
};

export default function OnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [progress, setProgress] = useState<Progress>({
    connectedAccounts: 0,
    postsCreated: 0,
    postsScheduled: 0,
  });

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      const response = await fetch("/api/onboarding");

      const data = await response.json();

      setProgress(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding() {
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error(error);
    }
  }

  const step1 = progress.connectedAccounts > 0;

  const step2 = progress.postsCreated > 0;

  const step3 = progress.postsScheduled > 0;

  const completed = step1 && step2 && step3;

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* HEADER */}

      <div className="mb-10">
        <h1 className="text-4xl font-bold">Welcome to Dizito 🚀</h1>

        <p className="text-gray-500 mt-2">
          Complete these steps to get started.
        </p>
      </div>

      {/* PROGRESS */}

      <div className="mb-10">
        <div className="flex justify-between mb-2">
          <span>Progress</span>

          <span>
            {[step1, step2, step3].filter(Boolean).length}
            /3
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded h-3">
          <div
            className="bg-blue-600 h-3 rounded transition-all"
            style={{
              width: `${
                ([step1, step2, step3].filter(Boolean).length / 3) * 100
              }%`,
            }}
          />
        </div>
      </div>

      {/* STEP 1 */}

      <div className="border rounded-lg p-6 mb-6">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              1. Connect your first account
            </h2>

            <p className="text-gray-500 mt-2">
              Connect Instagram, Facebook, LinkedIn or Pinterest.
            </p>
          </div>

          <div className="text-2xl">{step1 ? "✅" : "⭕"}</div>
        </div>

        {!step1 && (
          <button
            className="mt-4 bg-blue-600 text-white px-5 py-2 rounded"
            onClick={() => router.push("/accounts")}
          >
            Connect Account
          </button>
        )}
      </div>

      {/* STEP 2 */}

      <div className="border rounded-lg p-6 mb-6">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-semibold">2. Create your first post</h2>

            <p className="text-gray-500 mt-2">
              Create a draft or scheduled post.
            </p>
          </div>

          <div className="text-2xl">{step2 ? "✅" : "⭕"}</div>
        </div>

        {!step2 && (
          <button
            className="mt-4 bg-blue-600 text-white px-5 py-2 rounded"
            onClick={() => router.push("/dashboard")}
          >
            Create Post
          </button>
        )}
      </div>

      {/* STEP 3 */}

      <div className="border rounded-lg p-6 mb-6">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              3. Schedule your first post
            </h2>

            <p className="text-gray-500 mt-2">
              Publish your first scheduled post.
            </p>
          </div>

          <div className="text-2xl">{step3 ? "✅" : "⭕"}</div>
        </div>

        {!step3 && (
          <button
            className="mt-4 bg-blue-600 text-white px-5 py-2 rounded"
            onClick={() => router.push("/dashboard")}
          >
            Schedule Post
          </button>
        )}
      </div>

      {/* FINISH */}

      {completed && (
        <div className="border rounded-lg p-8 bg-green-50">
          <h2 className="text-2xl font-bold mb-3">🎉 Congratulations!</h2>

          <p className="text-gray-700 mb-6">
            You've completed onboarding and are ready to use Dizito.
          </p>

          <button
            className="bg-green-600 text-white px-6 py-3 rounded"
            onClick={completeOnboarding}
          >
            Go To Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
