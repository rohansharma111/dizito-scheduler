"use client";

import Image from "next/image";
import { MediaItem } from "@/types/media";

interface MediaCardProps {
  media: MediaItem;
  onDelete: (id: number) => void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function MediaCard({ media, onDelete }: MediaCardProps) {
  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this media?",
    );

    if (!confirmed) return;

    await onDelete(media.id);
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md">
      {/* Preview */}

      <div className="relative aspect-square bg-gray-100">
        {media.resource_type === "image" ? (
          <Image
            src={media.secure_url}
            alt={media.file_name}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Video Preview
          </div>
        )}
      </div>

      {/* Content */}

      <div className="space-y-3 p-4">
        <div>
          <p className="truncate font-medium" title={media.file_name}>
            {media.file_name}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {formatBytes(media.bytes)}
          </p>
        </div>

        {media.width && media.height && (
          <p className="text-sm text-gray-500">
            {media.width} × {media.height}px
          </p>
        )}

        <p className="text-xs text-gray-400">
          {new Date(media.created_at).toLocaleDateString()}
        </p>

        <button
          onClick={handleDelete}
          className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
