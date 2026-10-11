"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { MediaItem } from "@/types/media";

import UploadButton from "@/components/media/UploadButton";
import AIGenerateModal from "@/components/media/AIGenerateModal";
import { DizitoButton } from "@/components/dizito/DizitoUI";

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

  const [showAIModal, setShowAIModal] = useState(false);

  async function fetchMedia() {
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
  }

  useEffect(() => {
    if (!open) return;

    fetchMedia();
  }, [open]);

  async function handleUploadSuccess() {
    await fetchMedia();
  }

  async function handleAIGenerated(media: MediaItem) {
    await fetchMedia();

    onSelect(media);

    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
        <div className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          {/* Header */}

          <div className="flex items-center justify-between border-b p-5">
            <h2 className="text-xl font-semibold">Select Media</h2>

            <div className="flex items-center gap-3">
              <UploadButton onUploadSuccess={handleUploadSuccess} />

              <DizitoButton type="button" variant="ai" onClick={() => setShowAIModal(true)}>
                ✨ Generate AI
              </DizitoButton>

              <DizitoButton type="button" variant="secondary" onClick={onClose}>
                Close
              </DizitoButton>
            </div>
          </div>

          {/* Body */}

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                Loading media...
              </div>
            ) : media.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-500">
                <p>No media found.</p>

                <p className="text-sm">
                  Upload an image or generate one with AI.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {media.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item);

                      onClose();
                    }}
                    className="
                      overflow-hidden
                      rounded-lg
                      border
                      transition
                      hover:border-violet-400
                      hover:shadow
                    "
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
                        <video
                          src={item.secure_url}
                          className="h-full w-full object-cover"
                          muted
                        />
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

      <AIGenerateModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerated={handleAIGenerated}
      />
    </>
  );
}
