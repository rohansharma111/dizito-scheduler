"use client";

import { useState } from "react";

type Location = {
  id: number;
  name: string;
};

type InventoryItem = {
  variant_id: number;
  product_name: string;
  variant_name: string | null;
  sku: string;
  location_id: number;
  location_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
};

type Props = {
  item: InventoryItem;
  locations: Location[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function RemoveStockModal({ item, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("damaged");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const available = Number(item.quantity_available);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Enter a valid quantity.");
      return;
    }

    if (parsedQuantity > available) {
      setError(`Maximum removable quantity is ${available}.`);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/inventory/stock/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: item.location_id,
          variantId: item.variant_id,
          quantity: parsedQuantity,
          reason,
          note: note.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove stock");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove stock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Remove Stock</h2>

          <p className="mt-1 text-sm text-gray-500">
            {item.product_name}
            {item.variant_name ? ` · ${item.variant_name}` : ""}
          </p>

          <p className="mt-1 text-xs text-gray-400">SKU: {item.sku}</p>
        </div>

        <div className="mb-5 rounded-lg bg-gray-50 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Available stock</span>

            <span className="font-semibold text-gray-900">{available}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Quantity
            </label>

            <input
              type="number"
              min="1"
              max={available}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason
            </label>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
              <option value="expired">Expired</option>
              <option value="personal_use">Personal Use</option>
              <option value="manual_removal">Manual Removal</option>
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
              disabled={loading || available <= 0}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Removing..." : "Remove Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
