"use client";

import { FormEvent, useState } from "react";

interface InventoryVariant {
  variant_id: number;
  variant_name: string | null;
  sku: string;
  product_name: string;
}

interface Location {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface AddStockModalProps {
  variants: InventoryVariant[];
  locations: Location[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AddStockModal({
  variants,
  locations,
  onClose,
  onSaved,
}: AddStockModalProps) {
  const [variantId, setVariantId] = useState(
    variants[0] ? String(variants[0].variant_id) : "",
  );

  const [locationId, setLocationId] = useState(
    locations[0] ? String(locations[0].id) : "",
  );

  const [quantity, setQuantity] = useState("");

  const [movementType, setMovementType] = useState("purchase");

  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const parsedVariantId = Number(variantId);

    const parsedLocationId = Number(locationId);

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedVariantId) || parsedVariantId <= 0) {
      setError("Select a variant.");
      return;
    }

    if (!Number.isInteger(parsedLocationId) || parsedLocationId <= 0) {
      setError("Select a location.");
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variantId: parsedVariantId,
          locationId: parsedLocationId,
          quantity: parsedQuantity,
          movementType,
          note: note.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to add stock.");
      }

      onSaved();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/50
        flex
        items-center
        justify-center
        p-4
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          w-full
          max-w-lg
          bg-white
          rounded-2xl
          shadow-xl
        "
      >
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Add Stock</h2>

          <p className="text-sm text-gray-500 mt-1">
            Add units to a specific inventory location.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Product / Variant
            </label>

            <select
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              className="
                w-full
                border
                rounded-lg
                px-4
                py-3
                bg-white
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            >
              <option value="">Select variant</option>

              {variants.map((variant) => (
                <option key={variant.variant_id} value={variant.variant_id}>
                  {variant.product_name}
                  {variant.variant_name ? ` — ${variant.variant_name}` : ""} (
                  {variant.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>

            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="
                w-full
                border
                rounded-lg
                px-4
                py-3
                bg-white
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            >
              <option value="">Select location</option>

              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>

            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="e.g. 50"
              className="
                w-full
                border
                rounded-lg
                px-4
                py-3
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>

            <select
              value={movementType}
              onChange={(event) => setMovementType(event.target.value)}
              className="
                w-full
                border
                rounded-lg
                px-4
                py-3
                bg-white
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            >
              <option value="purchase">Purchase received</option>

              <option value="initial_stock">Initial stock</option>

              <option value="return">Customer return</option>

              <option value="adjustment">Stock adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Note</label>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Optional note..."
              className="
                w-full
                border
                rounded-lg
                px-4
                py-3
                outline-none
                resize-none
                focus:ring-2
                focus:ring-blue-500
              "
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
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
              type="submit"
              disabled={saving}
              className="
                px-5
                py-2.5
                rounded-lg
                bg-blue-600
                text-white
                font-medium
                hover:bg-blue-700
                disabled:opacity-50
              "
            >
              {saving ? "Adding..." : "Add Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
