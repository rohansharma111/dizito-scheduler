"use client";

import { useCallback, useEffect, useState } from "react";
import { Images, RefreshCw } from "lucide-react";
import UploadButton from "@/components/media/UploadButton";
import MediaGrid from "@/components/media/MediaGrid";
import { MediaItem } from "@/types/media";
import { DizitoBadge, DizitoButton, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  return fallback;
}

function isMediaItem(value: unknown): value is MediaItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MediaItem>;
  return typeof item.id === "number"
    && Number.isFinite(item.id)
    && typeof item.secure_url === "string"
    && typeof item.file_name === "string"
    && typeof item.resource_type === "string";
}

export default function MediaLibraryClient() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/media");
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(data, "Failed to fetch media"));
      if (!data || typeof data !== "object" || !("media" in data) || !Array.isArray(data.media) || !data.media.every(isMediaItem)) {
        throw new Error("The media library returned an unexpected response. Please retry.");
      }
      setMedia(data.media);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void fetchMedia(); }, [fetchMedia]);

  const handleUploadSuccess = () => { void fetchMedia(); };
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(data, "Delete failed"));
      if (data && typeof data === "object" && "success" in data && data.success !== true) {
        throw new Error(getErrorMessage(data, "Delete failed"));
      }
      setMedia((previous) => previous.filter((item) => item.id !== id));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete this asset. Please try again.");
    }
  };

  return (
    <DizitoPage>
      <DizitoPageHeader
        eyebrow="Assets"
        title="Media library"
        description="Upload and manage the reusable assets that power your marketing loop."
        action={<UploadButton onUploadSuccess={handleUploadSuccess} />}
      />
      <DizitoCard tone="soft" className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-white p-2.5 text-violet-600 shadow-sm"><Images size={18} /></div>
          <div>
            <div className="text-sm font-bold text-slate-900">Your content supply</div>
            <div className="text-xs text-slate-500">{media.length} asset{media.length === 1 ? "" : "s"} available for campaigns and content review.</div>
          </div>
          <DizitoBadge tone="info">Reusable</DizitoBadge>
          <DizitoButton variant="ghost" className="ml-auto" onClick={() => void fetchMedia()} disabled={loading}>
            <RefreshCw size={15} />Refresh
          </DizitoButton>
        </div>
      </DizitoCard>
      {error && (
        <DizitoState
          kind="error"
          title="Media action failed"
          description={error}
          action={<DizitoButton variant="secondary" onClick={() => void fetchMedia()} disabled={loading}>Retry</DizitoButton>}
        />
      )}
      {loading ? (
        <DizitoCard>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading media library" aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        </DizitoCard>
      ) : media.length === 0 ? (
        <DizitoState
          kind="empty"
          title="Your library is ready for its first asset"
          description="Upload a brand image, product photo, or campaign video to start building your reusable content supply."
          action={<UploadButton onUploadSuccess={handleUploadSuccess} />}
        />
      ) : (
        <DizitoCard><MediaGrid media={media} onDelete={handleDelete} /></DizitoCard>
      )}
    </DizitoPage>
  );
}
