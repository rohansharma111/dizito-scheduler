"use client";

import { useRef, useState } from "react";

interface UploadButtonProps {
  onUploadSuccess: () => void;
}

async function uploadVideoDirect(file: File) {
  const initResponse = await fetch("/api/upload/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType: file.type, size: file.size }),
  });

  const init = await initResponse.json();
  if (!initResponse.ok) throw new Error(init.error || "Unable to initialize video upload");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", init.apiKey);
  form.append("timestamp", String(init.timestamp));
  form.append("folder", init.folder);
  form.append("signature", init.signature);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${init.cloudName}/${init.resourceType}/upload`,
    { method: "POST", body: form },
  );
  const upload = await uploadResponse.json();
  if (!uploadResponse.ok) throw new Error(upload.error?.message || "Cloudinary video upload failed");

  const completeResponse = await fetch("/api/media/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicId: upload.public_id,
      fileName: file.name,
      mimeType: file.type,
    }),
  });
  const complete = await completeResponse.json();
  if (!completeResponse.ok) throw new Error(complete.error || "Unable to finalize video upload");

  return complete.media;
}

export default function UploadButton({ onUploadSuccess }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      if (file.type.startsWith("video/")) {
        await uploadVideoDirect(file);
      } else {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Upload failed");
      }

      onUploadSuccess();
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      console.error("Upload failed:", error);
      alert(error instanceof Error ? error.message : "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-m4v"
        onChange={handleFileChange}
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload Media"}
      </button>
    </>
  );
}
