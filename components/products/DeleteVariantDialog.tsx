"use client";

import { useState } from "react";

interface DeleteVariantDialogProps {
  productId: number;
  variantId: number;
  variantName?: string | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteVariantDialog({
  productId,
  variantId,
  variantName,
  onClose,
  onDeleted,
}: DeleteVariantDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    try {
      setDeleting(true);
      setError("");

      const response = await fetch(
        `/api/products/${productId}/variants/${variantId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete variant");
      }

      onDeleted();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/50
        p-4
      "
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold">Delete Variant?</h2>

        <p className="text-gray-600 mt-3">
          Are you sure you want to delete{" "}
          <strong>{variantName || "this variant"}</strong>?
        </p>

        <p className="text-sm text-gray-500 mt-2">This cannot be undone.</p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="
              px-4
              py-2.5
              rounded-lg
              border
              font-medium
              hover:bg-gray-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="
              px-4
              py-2.5
              rounded-lg
              bg-red-600
              text-white
              font-medium
              hover:bg-red-700
              disabled:opacity-50
            "
          >
            {deleting ? "Deleting..." : "Delete Variant"}
          </button>
        </div>
      </div>
    </div>
  );
}
