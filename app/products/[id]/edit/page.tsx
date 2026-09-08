"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Product {
  id: number | string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  status: "draft" | "active" | "archived";
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Product["status"]>("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load product");
        }

        if (cancelled) return;

        const loaded: Product = data.product;
        setProduct(loaded);
        setName(loaded.name || "");
        setBrand(loaded.brand || "");
        setCategory(loaded.category || "");
        setDescription(loaded.description || "");
        setStatus(loaded.status);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load product");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || null,
          category: category.trim() || null,
          description: description.trim() || null,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update product");
      }

      router.push(`/products/${productId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border rounded-xl p-8 text-gray-500">
          Loading product...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/products" className="text-sm text-gray-500 hover:text-gray-800">
          ← Products
        </Link>
        <div className="bg-white border rounded-xl p-8 text-red-600">
          {error || "Product not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/products/${productId}`}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← {product.name}
        </Link>

        <h1 className="text-3xl font-bold mt-4">Edit Product</h1>
        <p className="text-gray-500 mt-1">
          Update the canonical product information used across Dizito.
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
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Brand</label>
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={6}
            className="w-full border rounded-lg px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Product["status"])}
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link
            href={`/products/${productId}`}
            className="px-5 py-3 rounded-lg border font-medium hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
