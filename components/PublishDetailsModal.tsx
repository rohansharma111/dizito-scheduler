"use client";

import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";

type Target = {
  id: number;

  platform: string;

  status: string;

  account_name?: string;

  social_account_id: number;

  published_at?: string | null;

  publish_message?: string | null;

  retry_count?: number;

  manual_retry_count?: number;

  next_retry_at?: string | null;
};

type Props = {
  open: boolean;

  onClose: () => void;

  targets: Target[];

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

  const failedCount = targets.filter((t) =>
    ["permanent_failed", "failure_handler_crashed"].includes(t.status),
  ).length;

  function needsReconnect(message?: string | null) {
    if (!message) return false;

    return (
      message.includes("Malformed access token") ||
      message.includes("OAuthException") ||
      message.includes('"code":190') ||
      message.includes("Invalid OAuth") ||
      message.includes("Permission denied") ||
      message.includes("Session has expired")||
      message.includes("INVALID_ACCESS_TOKEN")
    );
  }

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
          md:w-[700px]
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
              {publishedCount}
              {" Published • "}
              {failedCount}
              {" Failed • "}
              {targets.length}
              {" Platforms"}
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
          {targets.map((target) => {
            const canRetry =
              [
                "retry_scheduled",
                "permanent_failed",
                "failure_handler_crashed",
              ].includes(target.status) && (target.manual_retry_count ?? 0) < 3;

            return (
              <div
                key={target.id}
                className="
                    border
                    rounded-xl
                    p-5
                  "
              >
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

                  <div className="flex-1">
                    <div className="font-semibold">{target.account_name}</div>

                    <div className="text-sm text-gray-500 capitalize">
                      {target.platform}
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        {target.status === "published" && "Published"}
                        {target.status === "scheduled" && "Scheduled"}
                        {target.status === "processing" && "Processing"}
                        {target.status === "retry_scheduled" && "Retrying"}
                        {target.status === "permanent_failed" &&
                          "Automatic retries exhausted"}
                        {target.status === "failure_handler_crashed" &&
                          "System Error"}
                      </div>

                      <div>
                        <span className="font-semibold">
                          Automatic retries:
                        </span>{" "}
                        {target.retry_count ?? 0}
                        /5
                      </div>

                      <div>
                        <span className="font-semibold">Manual retries:</span>{" "}
                        {target.manual_retry_count ?? 0}
                        /3
                      </div>

                      {target.next_retry_at && (
                        <div>
                          <span className="font-semibold">Next retry:</span>{" "}
                          {new Date(target.next_retry_at).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      )}

                      {target.published_at && (
                        <div>
                          <span className="font-semibold">Published:</span>{" "}
                          {new Date(target.published_at).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      )}

                      {target.publish_message && (
                        <>
                          <div className="font-semibold mt-4">Last error:</div>

                          <div className="text-red-500 break-all">
                            {target.publish_message}
                          </div>
                        </>
                      )}
                    </div>

                    {needsReconnect(target.publish_message) && (
                      <div
                        className="
      mt-4
      p-3
      rounded-lg
      bg-yellow-50
      border
      border-yellow-300
    "
                      >
                        <div className="font-medium text-yellow-800">
                          ⚠ {target.platform} session expired
                        </div>

                        <div className="text-sm text-yellow-700 mt-1">
                          This error cannot be fixed by retrying. Please
                          reconnect your account.
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-5">
                      {canRetry && !needsReconnect(target.publish_message) && (
                        <button
                          className="
                              bg-yellow-500
                              hover:bg-yellow-600
                              text-white
                              px-4
                              py-2
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
                          Retry Now
                        </button>
                      )}

                      {needsReconnect(target.publish_message) && (
                        <button
                          className="
      bg-blue-600
      hover:bg-blue-700
      text-white
      px-4
      py-2
      rounded
    "
                          onClick={() => {
                            window.open(
                              `/api/meta/connect?reconnect=${target.social_account_id}&type=recover`,
                              "_blank",
                            );
                          }}
                        >
                          Reconnect {target.platform}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
