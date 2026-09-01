"use client";

import { FormEvent, useEffect, useState } from "react";

interface Variant {
  id?: number;
  name?: string | null;
  sku: string;
  barcode?: string | null;
  price?: number | null;
  mrp?: number | null;
  cost_price?: number | null;
  weight?: number | null;
  status?: string;
}

interface VariantModalProps {
  productId: number;
  variant?: Variant | null;
  onClose: () => void;
  onSaved: () => void;
}

function toRupees(value?: number | null) {
  if (value === null || value === undefined) {
    return "";
  }

  return (Number(value) / 100).toString();
}

function toPaise(value: string) {
  if (!value.trim()) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round(number * 100);
}

export default function VariantModal({
  productId,
  variant,
  onClose,
  onSaved,
}: VariantModalProps) {
  const editing = Boolean(variant);

  const [name, setName] = useState(variant?.name ?? "");

  const [sku, setSku] = useState(variant?.sku ?? "");

  const [barcode, setBarcode] = useState(variant?.barcode ?? "");

  const [price, setPrice] = useState(toRupees(variant?.price));

  const [mrp, setMrp] = useState(toRupees(variant?.mrp));

  const [costPrice, setCostPrice] = useState(toRupees(variant?.cost_price));

  const [weight, setWeight] = useState(
    variant?.weight !== null && variant?.weight !== undefined
      ? String(variant.weight)
      : "",
  );

  const [status, setStatus] = useState(variant?.status ?? "active");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!sku.trim()) {
      setError("SKU is required.");
      return;
    }

    const pricePaise = toPaise(price);
    const mrpPaise = toPaise(mrp);
    const costPricePaise = toPaise(costPrice);

    if (price.trim() && pricePaise === null) {
      setError("Enter a valid price.");
      return;
    }

    if (mrp.trim() && mrpPaise === null) {
      setError("Enter a valid MRP.");
      return;
    }

    if (costPrice.trim() && costPricePaise === null) {
      setError("Enter a valid cost price.");
      return;
    }

    const weightValue = weight.trim() === "" ? null : Number(weight);

    if (
      weightValue !== null &&
      (!Number.isFinite(weightValue) || weightValue < 0)
    ) {
      setError("Enter a valid weight.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim() || null,
        sku: sku.trim(),
        barcode: barcode.trim() || null,
        price: pricePaise,
        mrp: mrpPaise,
        costPrice: costPricePaise,
        weight: weightValue,
        status,
      };

      const url = editing
        ? `/api/products/${productId}/variants/${variant!.id}`
        : `/api/products/${productId}/variants`;

      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save variant");
      }

      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
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
        flex
        items-center
        justify-center
        bg-black/50
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
          max-h-[90vh]
          overflow-y-auto
          bg-white
          rounded-2xl
          shadow-xl
        "
      >
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editing ? "Edit Variant" : "Add Variant"}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Define the sellable version of this product.
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
              Variant name
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. 50ml"
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
            <label className="block text-sm font-medium mb-2">SKU *</label>

            <input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              placeholder="e.g. RO-50"
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

            <p className="text-xs text-gray-500 mt-1">
              SKU must be unique in Dizito.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Barcode</label>

            <input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Optional"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Selling price
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="
                    w-full
                    border
                    rounded-lg
                    pl-8
                    pr-3
                    py-3
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                  "
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">MRP</label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mrp}
                  onChange={(event) => setMrp(event.target.value)}
                  className="
                    w-full
                    border
                    rounded-lg
                    pl-8
                    pr-3
                    py-3
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                  "
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cost</label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(event) => setCostPrice(event.target.value)}
                  className="
                    w-full
                    border
                    rounded-lg
                    pl-8
                    pr-3
                    py-3
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                  "
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Weight</label>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="e.g. 120"
                className="
                  w-full
                  border
                  rounded-lg
                  px-4
                  py-3
                  pr-16
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500
                "
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                grams
              </span>
            </div>
          </div>

          {editing && (
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
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
              >
                <option value="active">Active</option>

                <option value="inactive">Inactive</option>

                <option value="archived">Archived</option>
              </select>
            </div>
          )}

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
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Variant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
