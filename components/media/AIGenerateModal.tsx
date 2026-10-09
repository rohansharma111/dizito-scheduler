"use client";

import { useId, useState } from "react";
import { MediaItem } from "@/types/media";

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerated: (media: MediaItem) => void;
}

function isMediaItem(value: unknown): value is MediaItem {
  if (!value || typeof value !== "object") return false;
  const media = value as Partial<MediaItem>;
  return typeof media.id === "number"
    && Number.isFinite(media.id)
    && typeof media.secure_url === "string"
    && typeof media.file_name === "string"
    && typeof media.resource_type === "string";
}

function errorMessage(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string" && value.error.trim()) {
    return value.error;
  }
  return fallback;
}

export default function AIGenerateModal({ open, onClose, onGenerated }: Props) {
  const id = useId();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1024x1536" | "1536x1024">("1024x1024");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function generate() {
    if (!prompt.trim()) {
      setError("Enter a prompt before generating an image.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), size, quality }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(data, "Image generation failed. Please try again."));
      if (!data || typeof data !== "object" || !("media" in data) || !isMediaItem(data.media)) {
        throw new Error("The generation service returned an unexpected response. Please try again.");
      }

      onGenerated(data.media);
      setPrompt("");
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4" onKeyDown={(event) => { if (event.key === "Escape" && !loading) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="my-auto w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl sm:p-6"
      >
        <h2 id={`${id}-title`} className="mb-2 text-2xl font-bold">✨ Generate AI Image</h2>
        <p id={`${id}-description`} className="mb-6 text-sm text-slate-600">Describe the image you want to create. Generation uses your plan’s available image allowance.</p>

        {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <label htmlFor={`${id}-prompt`} className="mb-2 block font-medium">Prompt</label>
        <textarea
          id={`${id}-prompt`}
          rows={5}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="mb-6 w-full rounded-lg border p-3"
          placeholder="Luxury perfume bottle on black marble, studio lighting..."
          disabled={loading}
          required
          aria-invalid={Boolean(error && !prompt.trim())}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-size`} className="mb-2 block font-medium">Size</label>
            <select id={`${id}-size`} value={size} onChange={(event) => setSize(event.target.value as typeof size)} disabled={loading} className="w-full rounded-lg border p-3">
              <option value="1024x1024">Square</option>
              <option value="1024x1536">Portrait</option>
              <option value="1536x1024">Landscape</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-quality`} className="mb-2 block font-medium">Quality</label>
            <select id={`${id}-quality`} value={quality} onChange={(event) => setQuality(event.target.value as typeof quality)} disabled={loading} className="w-full rounded-lg border p-3">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border px-5 py-2 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => void generate()} disabled={loading || !prompt.trim()} aria-busy={loading} className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
        {loading && <p role="status" className="mt-4 text-sm text-slate-600">Generating your image. This may take a little while.</p>}
      </section>
    </div>
  );
}
