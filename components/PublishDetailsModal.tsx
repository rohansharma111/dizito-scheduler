"use client";

import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";

type Target = {
  id: number;
  platform: string;
  status: string;
  account_name?: string;
  published_at?: string | null;
  publish_message?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  targets: any[];
  postId: number | null;
  setTargets: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function PublishDetailsModal({
  open,
  onClose,
  targets,
  postId,
  setTargets,
}: Props) {
  if (!open) return null;

  const publishedCount = targets.filter((t) => t.status === "published").length;

  const failedCount = targets.filter((t) => t.status === "failed").length;

  return (
    <div
      className="
        fixed
        inset-0
        bg-black/50
        flex
        items-center
        justify-center
        z-50
        p-4
      "
      onClick={onClose}
    >
      <div
        className="
          bg-white
          rounded-xl
          p-6
          w-[95vw]
          md:w-[600px]
          max-h-[90vh]
          overflow-y-auto
          shadow-xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold">Publish Details</h2>

            <div className="text-sm text-gray-500 mt-1">
              {publishedCount} Published
              {" • "}
              {failedCount} Failed
              {" • "}
              {targets.length} Platforms
            </div>
          </div>

          <button
            className="
              text-xl
              hover:text-gray-600
            "
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* TARGETS */}
        <div className="space-y-4">
          {targets.map((target) => (
            <div
              key={target.id}
              className="
                  border
                  rounded-xl
                  p-4
                  flex
                  flex-col
                  md:flex-row
                  md:justify-between
                  gap-4
                "
            >
              {/* LEFT */}
              <div className="flex gap-3">
                {target.platform === "instagram" && (
                  <FaInstagram className="text-pink-500 text-2xl mt-1" />
                )}

                {target.platform === "facebook" && (
                  <FaFacebook className="text-blue-600 text-2xl mt-1" />
                )}

                {target.platform === "linkedin" && (
                  <FaLinkedin className="text-blue-700 text-2xl mt-1" />
                )}

                <div>
                  <div className="font-semibold">{target.account_name}</div>

                  <div className="text-sm text-gray-500 capitalize">
                    {target.platform}
                  </div>

                  {target.published_at && (
                    <div className="text-xs text-gray-500 mt-2">
                      Published:{" "}
                      {new Date(target.published_at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </div>
                  )}

                  {target.publish_message && (
                    <div className="mt-2 text-sm text-red-500 break-words">
                      {target.publish_message}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col items-start md:items-end gap-2">
                {target.status === "published" && (
                  <span className="text-green-600 font-medium">
                    ✅ Published
                  </span>
                )}

                {target.status === "scheduled" && (
                  <span className="text-blue-600 font-medium">
                    ⏳ Scheduled
                  </span>
                )}

                {target.status === "processing" && (
                  <span className="text-yellow-600 font-medium">
                    🔄 Processing
                  </span>
                )}

                {target.status === "failed" && (
                  <>
                    <span className="text-red-600 font-medium">❌ Failed</span>

                    <button
                      className="
                          bg-yellow-500
                          hover:bg-yellow-600
                          text-white
                          px-3
                          py-1
                          rounded
                        "
                      onClick={async () => {
                        const response = await fetch(
                          `/api/post-targets/${target.id}/retry`,
                          {
                            method: "POST",
                          },
                        );

                        const data = await response.json();

                        if (!response.ok) {
                          alert(data.error || "Retry failed");
                          return;
                        }

                        if (!postId) {
                          alert("Post ID missing");
                          return;
                        }

                        const refresh = await fetch(
                          `/api/posts/${postId}/targets`,
                        );

                        const latest = await refresh.json();

                        setTargets(latest);

                        alert("Queued for retry");
                      }}
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
