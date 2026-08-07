"use client";

import { useState } from "react";
import { MediaItem } from "@/types/media";

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerated: (media: MediaItem) => void;
}

export default function AIGenerateModal({ open, onClose, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("");

  const [size, setSize] = useState<"1024x1024" | "1024x1536" | "1536x1024">(
    "1024x1024",
  );

  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");

  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function generate() {
    if (!prompt.trim()) {
      alert("Enter a prompt");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/media/generate", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          prompt,
          size,
          quality,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      onGenerated(data.media);

      setPrompt("");

      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-6 text-2xl font-bold">✨ Generate AI Image</h2>

        <label className="mb-2 block font-medium">Prompt</label>

        <textarea
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mb-6 w-full rounded-lg border p-3"
          placeholder="Luxury perfume bottle on black marble, studio lighting..."
        />

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-medium">Size</label>

            <select
              value={size}
              onChange={(e) => setSize(e.target.value as any)}
              className="w-full rounded-lg border p-3"
            >
              <option value="1024x1024">Square</option>

              <option value="1024x1536">Portrait</option>

              <option value="1536x1024">Landscape</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium">Quality</label>

            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="w-full rounded-lg border p-3"
            >
              <option value="low">Low</option>

              <option value="medium">Medium</option>

              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border px-5 py-2"
          >
            Cancel
          </button>

          <button
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
