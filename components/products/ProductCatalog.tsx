"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import ProductsTable from "@/components/products/ProductsTable";

type Product = { id: number; name: string; brand?: string | null; category?: string | null; status: string };

export default function ProductCatalog({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "draft">("all");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesQuery = !normalized || [product.name, product.brand, product.category]
        .some((value) => value?.toLocaleLowerCase().includes(normalized));
      const matchesStatus = status === "all"
        || (status === "active" ? product.status.toLowerCase() === "active" : !["active", "archived"].includes(product.status.toLowerCase()));
      return matchesQuery && matchesStatus;
    });
  }, [products, query, status]);

  return (
    <>
      <section aria-label="Filter products" className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search products</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search products, brands, categories…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" />
          </label>
          <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label="Product status">
            <SlidersHorizontal size={16} className="mr-1 hidden text-slate-400 sm:block" />
            {(["all", "active", "draft"] as const).map((option) => (
              <button key={option} type="button" onClick={() => setStatus(option)} aria-pressed={status === option} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition ${status === option ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                {option === "all" ? "All" : option === "active" ? "Active" : "Draft"}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 px-1 text-xs text-slate-500" aria-live="polite">
          Showing {filtered.length} of {products.length} product{products.length === 1 ? "" : "s"}
          {query.trim() ? ` matching “${query.trim()}”` : ""}.
        </p>
      </section>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <p className="font-semibold text-slate-900">{products.length === 0 ? "No products yet" : "No matching products"}</p>
          <p className="mt-1 text-sm text-slate-500">{products.length === 0 ? "Add a product to start building your catalog." : "Try another search or choose a different status filter."}</p>
          {(query || status !== "all") && <button type="button" onClick={() => { setQuery(""); setStatus("all"); }} className="mt-4 text-sm font-semibold text-violet-700 hover:underline">Clear filters</button>}
        </div>
      ) : <ProductsTable products={filtered} />}
    </>
  );
}
