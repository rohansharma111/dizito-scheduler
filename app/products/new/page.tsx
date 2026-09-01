"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || null,
          category: category.trim() || null,
          description: description.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create product");
      }

      router.push(`/products/${data.product.id}`);

      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/products"
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Products
        </Link>

        <h1 className="text-3xl font-bold mt-4">Create Product</h1>

        <p className="text-gray-500 mt-1">
          Add the basic information for your product.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-xl p-6 md:p-8 space-y-6"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Product name</label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Rose Oud Perfume"
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
          <label className="block text-sm font-medium mb-2">Brand</label>

          <input
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            placeholder="e.g. Dizito"
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
          <label className="block text-sm font-medium mb-2">Category</label>

          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="e.g. Perfume"
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
          <label className="block text-sm font-medium mb-2">Description</label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            placeholder="Describe your product..."
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

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link
            href="/products"
            className="
              px-5
              py-3
              rounded-lg
              border
              font-medium
              hover:bg-gray-50
            "
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="
              bg-blue-600
              text-white
              px-5
              py-3
              rounded-lg
              font-medium
              hover:bg-blue-700
              disabled:opacity-50
            "
          >
            {saving ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
