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

export default function AdjustStockModal({ item, onClose, onSuccess }: Props) {
  const [quantityOnHand, setQuantityOnHand] = useState(
    String(item.quantity_on_hand),
  );

  const [reason, setReason] = useState("stock_count");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const parsedQuantity = Number(quantityOnHand);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setError("Enter a valid quantity.");
      return;
    }

    if (parsedQuantity < item.quantity_reserved) {
      setError(
        `Quantity cannot be lower than reserved stock (${item.quantity_reserved}).`,
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/inventory/stock/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: item.location_id,
          variantId: item.variant_id,
          quantityOnHand: parsedQuantity,
          reason,
          note: note.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to adjust stock");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust stock");
    } finally {
      setLoading(false);
    }
  }

  const difference = Number(quantityOnHand) - Number(item.quantity_on_hand);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>

          <p className="mt-1 text-sm text-gray-500">
            {item.product_name}
            {item.variant_name ? ` · ${item.variant_name}` : ""}
          </p>

          <p className="mt-1 text-xs text-gray-400">SKU: {item.sku}</p>

          <p className="mt-1 text-xs text-gray-400">
            Location: {item.location_name}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Current</div>

            <div className="mt-1 text-lg font-semibold">
              {item.quantity_on_hand}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Reserved</div>

            <div className="mt-1 text-lg font-semibold">
              {item.quantity_reserved}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Available</div>

            <div className="mt-1 text-lg font-semibold">
              {item.quantity_available}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Actual quantity on hand
            </label>

            <input
              type="number"
              min={item.quantity_reserved}
              value={quantityOnHand}
              onChange={(e) => setQuantityOnHand(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />

            <p className="mt-1 text-xs text-gray-500">
              Enter the physical quantity currently in stock.
            </p>
          </div>

          {Number.isInteger(difference) && difference !== 0 && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
              Adjustment:{" "}
              <span className="font-semibold">
                {difference > 0 ? "+" : ""}
                {difference}
              </span>
            </div>
          )}

          {difference === 0 && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
              No quantity change.
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason
            </label>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="stock_count">Physical Stock Count</option>

              <option value="correction">Inventory Correction</option>

              <option value="damage">Damage Correction</option>

              <option value="loss">Loss Correction</option>

              <option value="other">Other</option>
            </select>
          </div>

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

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

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
              disabled={loading}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
