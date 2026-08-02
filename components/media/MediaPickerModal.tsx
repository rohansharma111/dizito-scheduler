"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MediaItem } from "@/types/media";

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
}

export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
}: MediaPickerModalProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchMedia = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/media");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load media");
        }

        setMedia(data.media);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}

        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-xl font-semibold">Select Media</h2>

          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-2 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        {/* Body */}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              Loading media...
            </div>
          ) : media.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              No media found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="overflow-hidden rounded-lg border transition hover:border-blue-500 hover:shadow"
                >
                  <div className="relative aspect-square">
                    {item.resource_type === "image" ? (
                      <Image
                        src={item.secure_url}
                        alt={item.file_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                        Video
                      </div>
                    )}
                  </div>

                  <div className="truncate border-t p-2 text-sm">
                    {item.file_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
