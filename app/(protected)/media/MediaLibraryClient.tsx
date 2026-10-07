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
    <div className="dizito-page space-y-5">
      {/* Header */}

      <div className="dizito-page-header">
        <div>
          <div><div className="dizito-eyebrow"><Images size={13}/>Assets</div><h1 className="dizito-title">Media library</h1>

          <p className="text-sm text-gray-500">
            Upload and manage your media files.
          </p>
        </div>

        <UploadButton onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Content */}

      {loading ? (
        <div className="dizito-card animate-pulse py-20 text-center text-slate-400">Loading your content supply…</div>
      ) : media.length === 0 ? (
        <EmptyState />
      ) : (
        <MediaGrid media={media} onDelete={handleDelete} />
      )}
    </div>
  );
}
