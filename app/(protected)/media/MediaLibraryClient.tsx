"use client";

import { useCallback, useEffect, useState } from "react";
import UploadButton from "@/components/media/UploadButton";
import MediaGrid from "@/components/media/MediaGrid";
import EmptyState from "@/components/media/EmptyState";
import { MediaItem } from "@/types/media";

export default function MediaLibraryClient() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/media");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch media");
      }

      setMedia(data.media);
    } catch (error) {
      console.error("Failed to load media:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUploadSuccess = () => {
    fetchMedia();
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Delete failed");
      }

      setMedia((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Unable to delete media.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>

          <p className="text-sm text-gray-500">
            Upload and manage your media files.
          </p>
        </div>

        <UploadButton onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Content */}

      {loading ? (
        <div className="py-20 text-center">Loading media...</div>
      ) : media.length === 0 ? (
        <EmptyState />
      ) : (
        <MediaGrid media={media} onDelete={handleDelete} />
      )}
    </div>
  );
}
