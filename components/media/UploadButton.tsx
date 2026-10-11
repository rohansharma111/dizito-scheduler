"use client";

import { useRef, useState } from "react";
import { DizitoButton } from "@/components/dizito/DizitoUI";

interface UploadButtonProps {
  onUploadSuccess: () => void;
}

const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const VIDEO_MAX_BYTES = 1024 * 1024 * 1024;

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function uploadVideoDirect(file: File) {
  const initResponse = await fetch("/api/upload/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType: file.type, size: file.size }),
  });
  const initData: unknown = await readJson(initResponse);
  if (!initResponse.ok) throw new Error(getErrorMessage(initData, "Unable to initialize video upload"));
  if (!isRecord(initData)
    || typeof initData.apiKey !== "string"
    || typeof initData.timestamp !== "number"
    || typeof initData.publicId !== "string"
    || typeof initData.allowedFormats !== "string"
    || typeof initData.signature !== "string"
    || typeof initData.cloudName !== "string"
    || typeof initData.resourceType !== "string"
  ) {
    throw new Error("The upload service returned an unexpected response. Please try again.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", initData.apiKey);
  form.append("timestamp", String(initData.timestamp));
  form.append("public_id", initData.publicId);
  form.append("allowed_formats", initData.allowedFormats);
  form.append("signature", initData.signature);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(initData.cloudName)}/${encodeURIComponent(initData.resourceType)}/upload`,
    { method: "POST", body: form },
  );
  const uploadData: unknown = await readJson(uploadResponse);
  if (!uploadResponse.ok) {
    const uploadError = isRecord(uploadData) && isRecord(uploadData.error) ? uploadData.error.message : null;
    throw new Error(typeof uploadError === "string" ? uploadError : "Cloudinary video upload failed");
  }
  if (!isRecord(uploadData) || typeof uploadData.public_id !== "string" || !uploadData.public_id) {
    throw new Error("The upload service did not return a valid media identifier. Please try again.");
  }

  const completeResponse = await fetch("/api/media/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicId: uploadData.public_id,
      fileName: file.name,
      mimeType: file.type,
    }),
  });
  const completeData: unknown = await readJson(completeResponse);
  if (!completeResponse.ok) throw new Error(getErrorMessage(completeData, "Unable to finalize video upload"));
  if (!isRecord(completeData) || !isRecord(completeData.media)) {
    throw new Error("The upload completed but the media record could not be confirmed. Refresh the library before retrying.");
  }
}

export default function UploadButton({ onUploadSuccess }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const isVideo = file.type.startsWith("video/");
      const allowedImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      const allowedVideo = ["video/mp4", "video/quicktime", "video/x-m4v"].includes(file.type);
      if (!allowedImage && !allowedVideo) {
        throw new Error("Choose a JPG, PNG, WebP, MP4, MOV, or M4V file.");
      }
      if (!isVideo && file.size > IMAGE_MAX_BYTES) {
        throw new Error("Images must be 25 MB or smaller.");
      }
      if (isVideo && file.size > VIDEO_MAX_BYTES) {
        throw new Error("Videos must be 1 GB or smaller.");
      }

      setUploading(true);
      if (isVideo) {
        await uploadVideoDirect(file);
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const data: unknown = await readJson(response);
        if (!response.ok) throw new Error(getErrorMessage(data, "Upload failed"));
        if (!isRecord(data) || data.success !== true) {
          throw new Error("The upload service returned an unexpected response. Please refresh the library before retrying.");
        }
      }
      onUploadSuccess();
    } catch (error) {
      console.error("Upload failed:", error);
      setError(error instanceof Error ? error.message : "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="inline-flex max-w-full flex-col items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-m4v"
        onChange={handleFileChange}
        aria-label="Choose an image or video to upload"
        disabled={uploading}
      />
      <DizitoButton
        type="button"
        variant="primary"
        onClick={handleClick}
        disabled={uploading}
        aria-busy={uploading}
      >
        {uploading ? "Uploading..." : "Upload Media"}
      </DizitoButton>
      {uploading && <p role="status" className="text-sm text-slate-600">Uploading your media. Please keep this page open.</p>}
      {error && <p role="alert" className="max-w-sm text-sm text-red-700">{error}</p>}
    </div>
  );
}
