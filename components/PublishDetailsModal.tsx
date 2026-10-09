"use client";

import { FaInstagram, FaFacebook, FaLinkedin, FaPinterest } from "react-icons/fa";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";
import styles from "./PublishDetailsModal.module.css";

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
      message.includes("Session has expired") ||
      message.includes("INVALID_ACCESS_TOKEN")
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] sm:p-5 ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`max-h-[min(90vh,820px)] w-[min(95vw,700px)] overflow-y-auto rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:p-6 ${styles.panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className={`mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4 sm:mb-6 ${styles.header}`}>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-950">Publish Details</h2>

            <div className="mt-1.5 text-sm text-slate-500">
              {publishedCount}
              {" Published • "}
              {failedCount}
              {" Failed • "}
              {targets.length}
              {" Platforms"}
            </div>
          </div>

          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500" aria-label="Close publish details"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* TARGETS */}
        <div className={`space-y-3.5 sm:space-y-4 ${styles.targets}`}>
          {targets.map((target) => {
            const canRetry =
              [
                "retry_scheduled",
                "permanent_failed",
                "failure_handler_crashed",
              ].includes(target.status) && (target.manual_retry_count ?? 0) < 3;
            const showRetryInfo =
              target.status !== "published" ||
              (target.retry_count ?? 0) > 0 ||
              (target.manual_retry_count ?? 0) > 0;

            return (
              <div
                key={target.id}
                className={`rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_5px_18px_rgba(15,23,42,0.025)] transition hover:border-violet-200 sm:p-5 ${styles.targetCard}`}
              >
                <div className="flex min-w-0 gap-3 sm:gap-3.5">
                  {target.platform === "instagram" && (
                    <FaInstagram className="text-pink-500 text-2xl mt-1" />
                  )}

                  {target.platform === "facebook" && (
                    <FaFacebook className="text-blue-600 text-2xl mt-1" />
                  )}

                  {target.platform === "linkedin" && (
                    <FaLinkedin className="text-blue-700 text-2xl mt-1" />
                  )}

                  {target.platform === "pinterest" && (
                    <FaPinterest className="text-red-600 text-2xl mt-1" />
                  )}

                  {target.platform === "google-business" && (
                    <GoogleBusinessIcon className="text-green-600 text-2xl mt-1" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="break-words font-bold tracking-tight text-slate-900">{target.account_name}</div>

                    <div className="mt-0.5 text-sm capitalize text-slate-500">
                      {target.platform}
                    </div>

                    <div className="mt-4 space-y-2.5 text-sm leading-6 text-slate-600">
                      {/* STATUS */}
                      <div>
                        <span className="font-bold text-slate-800">Status:</span>{" "}
                        {target.status === "published" && "Published"}
                        {target.status === "scheduled" && "Scheduled"}
                        {target.status === "processing" && "Processing"}
                        {target.status === "retry_scheduled" && "Retrying"}
                        {target.status === "failure_handler_crashed" &&
                          "System Error"}
                        {target.status === "permanent_failed" && (
                          <span className="font-semibold text-rose-600">
                            Automatic retries exhausted
                          </span>
                        )}
                      </div>

                      {/* RETRY INFO */}
                      {(target.status !== "published" ||
                        (target.status === "published" &&
                          ((target.retry_count ?? 0) > 0 ||
                            (target.manual_retry_count ?? 0) > 0))) && (
                        <>
                          <div>
                            <span className="font-bold text-slate-800">
                              Automatic retries:
                            </span>{" "}
                            {target.status === "permanent_failed"
                              ? "5/5"
                              : `${target.retry_count ?? 0}/5`}
                          </div>

                          <div>
                            <span className="font-semibold">
                              Manual retries:
                            </span>{" "}
                            {target.manual_retry_count ?? 0}/3
                          </div>
                        </>
                      )}

                      {/* NEXT RETRY */}
                      {target.next_retry_at && (
                        <div>
                          <span className="font-semibold">Next retry:</span>{" "}
                          {new Date(target.next_retry_at).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      )}

                      {/* PUBLISHED */}
                      {target.published_at && (
                        <div>
                          <span className="font-semibold">Published:</span>{" "}
                          {new Date(target.published_at).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      )}

                      {/* ERROR */}
                      {target.publish_message && (
                        <>
                          <div className="mt-4 font-bold text-slate-800">Last error:</div>

                          <div className="break-all rounded-xl bg-rose-50 px-3 py-2 text-rose-700">
                            {target.publish_message}
                          </div>
                        </>
                      )}
                    </div>

                    {needsReconnect(target.publish_message) && (
                      <div
                        className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5"
                      >
                        <div className="font-bold text-amber-900">
                          ⚠ {target.platform} session expired
                        </div>

                        <div className="mt-1 text-sm leading-5 text-amber-800">
                          This error cannot be fixed by retrying. Please
                          reconnect your account.
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {canRetry && !needsReconnect(target.publish_message) && (
                        <button
                          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#c7f36b] px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-[#aee94c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
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
                          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                          onClick={() => {
                            if (
                              target.platform === "facebook" ||
                              target.platform === "instagram"
                            ) {
                              window.location.href = `/api/meta/connect?reconnect=${target.social_account_id}&type=recover`;
                            }

                            if (target.platform === "linkedin") {
                              window.location.href = `/api/linkedin/login?reconnect=${target.social_account_id}&type=recover`;
                            }

                            if (target.platform === "pinterest") {
                              window.location.href = `/api/pinterest/login?reconnect=${target.social_account_id}&type=recover`;
                            }

                            if (target.platform === "google-business") {
                              window.location.href = `/api/google-business/login?reconnect=${target.social_account_id}&type=recover`;
                            }
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
