"use client";

import { useMemo, useState } from "react";

interface ProductMedia {
  id: number;
  media_id: number;
  secure_url: string;
  media_type?: "image" | "video";
  poster_url?: string | null;
  original_name?: string | null;
  file_name?: string | null;
  is_primary: boolean;
  sort_order: number;
}

interface LibraryMedia {
  id: number;
  secure_url: string;
  media_type?: "image" | "video";
  poster_url?: string | null;
  original_name?: string | null;
  file_name?: string | null;
}

interface Props {
  productId: number;
  initialMedia: ProductMedia[];
}

export default function ProductMediaManager({ productId, initialMedia }: Props) {
  const [media, setMedia] = useState(initialMedia);
  const [library, setLibrary] = useState<LibraryMedia[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const availableLibraryMedia = useMemo(() => {
    const attached = new Set(media.map((item) => item.media_id));
    return library.filter((item) => !attached.has(item.id));
  }, [library, media]);

  async function openLibrary() {
    setError("");
    setOpen(true);

    if (library.length > 0) return;

    try {
      setLoadingLibrary(true);
      const response = await fetch("/api/media");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load Media Library");
      }

      setLibrary(data.media || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Media Library");
    } finally {
      setLoadingLibrary(false);
    }
  }

  async function attach(mediaId: number) {
    try {
      setBusyId(mediaId);
      setError("");

      const response = await fetch(`/api/products/${productId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId,
          sortOrder: media.length,
          isPrimary: media.length === 0,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to attach media");
      }

      const source = library.find((item) => item.id === mediaId);
      if (!source) return;

      setMedia((current) => [
        ...current,
        {
          ...source,
          media_id: source.id,
          is_primary: current.length === 0,
          sort_order: current.length,
          id: data.media.id,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach media");
    } finally {
      setBusyId(null);
    }
  }

  async function updateItem(item: ProductMedia, patch: { isPrimary?: boolean; sortOrder?: number }) {
    try {
      setBusyId(item.id);
      setError("");

      const response = await fetch(`/api/products/${productId}/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update media");
      }

      setMedia((current) =>
        current.map((entry) => {
          if (patch.isPrimary && entry.id !== item.id) {
            return { ...entry, is_primary: false };
          }
          return entry.id === item.id ? { ...entry, ...data.media } : entry;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update media");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: ProductMedia) {
    try {
      setBusyId(item.id);
      setError("");

      const response = await fetch(`/api/products/${productId}/media/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to remove media");
      }

      const remaining = media.filter((entry) => entry.id !== item.id);
      setMedia(remaining);

      if (item.is_primary && remaining.length > 0) {
        await updateItem(remaining[0], { isPrimary: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove media");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={openLibrary}
          className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          + Add Media
        </button>
      </div>

      {media.length === 0 ? (
        <div className="border border-dashed rounded-xl py-12 text-center">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="font-medium">No product images</p>
          <p className="text-sm text-gray-500 mt-1">Add images from your Media Library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="relative aspect-square rounded-xl overflow-hidden border bg-gray-50">
                {item.media_type === "video" ? (
                  <video
                    src={item.secure_url}
                    poster={item.poster_url ?? undefined}
                    controls
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={item.secure_url}
                    alt={item.original_name || item.file_name || "Product image"}
                    className="w-full h-full object-cover"
                  />
                )}
                {item.is_primary && (
                  <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded-full text-xs font-semibold shadow">
                    ★ Primary
                  </div>
                )}
              </div>

              <div className="flex gap-2 text-xs">
                {!item.is_primary && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => updateItem(item, { isPrimary: true })}
                    className="border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => remove(item)}
                  className="border border-red-200 text-red-600 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="font-semibold text-lg">Choose from Media Library</h3>
                <p className="text-sm text-gray-500">Only your existing media can be attached.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-900">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {loadingLibrary ? (
                <p className="text-gray-500">Loading Media Library...</p>
              ) : availableLibraryMedia.length === 0 ? (
                <p className="text-gray-500">No unattached media is available.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {availableLibraryMedia.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      disabled={busyId === item.id}
                      onClick={() => attach(item.id)}
                      className="text-left border rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 disabled:opacity-50"
                    >
                      <div className="aspect-square bg-gray-50">
                        {item.media_type === "video" ? (
                          <video
                            src={item.secure_url}
                            poster={item.poster_url ?? undefined}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={item.secure_url}
                            alt={item.original_name || item.file_name || "Media"}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="px-3 py-2 text-sm truncate">
                        {item.original_name || item.file_name || `Media ${item.id}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
