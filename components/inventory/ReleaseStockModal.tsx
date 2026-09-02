"use client";

import { useState } from "react";

type InventoryItem = {
  id: number;
  location_id: number;
  location_name: string;
  variant_id: number;
  variant_name: string | null;
  sku: string;
  product_id: number;
  product_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
};

type Props = {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReleaseStockModal({ item, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState("");
  const [referenceType, setReferenceType] = useState("manual");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reserved = Number(item.quantity_reserved);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Enter a valid quantity.");
      return;
    }

    if (parsedQuantity > reserved) {
      setError(`Maximum releasable quantity is ${reserved}.`);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/inventory/stock/release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: item.location_id,
          variantId: item.variant_id,
          quantity: parsedQuantity,
          referenceType,
          note: note.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to release stock");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release stock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {/* HEADER */}

        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Release Reservation
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {item.product_name}
            {item.variant_name ? ` · ${item.variant_name}` : ""}
          </p>

          <p className="mt-1 text-xs text-gray-400">SKU: {item.sku}</p>

          <p className="mt-1 text-xs text-gray-400">
            Location: {item.location_name}
          </p>
        </div>

        {/* INVENTORY SUMMARY */}

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">On Hand</div>

            <div className="mt-1 text-lg font-semibold">
              {item.quantity_on_hand}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Reserved</div>

            <div className="mt-1 text-lg font-semibold">{reserved}</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Available</div>

            <div className="mt-1 text-lg font-semibold">
              {item.quantity_available}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* QUANTITY */}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Quantity to release
            </label>

            <input
              type="number"
              min="1"
              max={reserved}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />

            <p className="mt-1 text-xs text-gray-500">
              Maximum reserved: {reserved}
            </p>
          </div>

          {/* REFERENCE TYPE */}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reference
            </label>

            <select
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="manual">Manual</option>

              <option value="order">Order</option>

              <option value="marketplace_order">Marketplace Order</option>
            </select>
          </div>

          {/* NOTE */}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Note
            </label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional note"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          {/* ERROR */}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ACTIONS */}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || reserved <= 0}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Releasing..." : "Release Reservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
