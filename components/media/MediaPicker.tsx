"use client";

import { useState } from "react";
import Image from "next/image";
import { MediaItem } from "@/types/media";
import MediaPickerModal from "./MediaPickerModal";
import { DizitoButton } from "@/components/dizito/DizitoUI";

interface MediaPickerProps {
  value?: MediaItem | null;
  onChange: (media: MediaItem | null) => void;
}

export default function MediaPicker({ value, onChange }: MediaPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        {value ? (
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
              {value.resource_type === "image" ? (
                <Image
                  src={value.secure_url}
                  alt={value.file_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-100 text-xs text-gray-500">
                  Video
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="font-medium">{value.file_name}</p>

              <p className="text-sm text-gray-500">
                {(value.bytes / 1024).toFixed(1)} KB
              </p>
            </div>

            <DizitoButton type="button" variant="secondary" onClick={() => setOpen(true)}>
              Change
            </DizitoButton>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">No media selected</p>

              <p className="text-sm text-gray-500">
                Choose an image or video from your library.
              </p>
            </div>

            <DizitoButton type="button" variant="primary" onClick={() => setOpen(true)}>
              Choose Media
            </DizitoButton>
          </div>
        )}
      </div>

      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(media) => {
          onChange(media);
          setOpen(false);
        }}
      />
    </>
  );
}
