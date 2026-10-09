"use client";

import { useState } from "react";
import Link from "next/link";
import TablePagination from "@/components/dizito/TablePagination";

type ProductRow = {
  id: number;
  name: string;
  brand?: string | null;
  category?: string | null;
  status: string;
};

export default function ProductsTable({ products }: { products: ProductRow[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(products.length / pageSize)));
  const visibleProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Product</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Category</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => (
              <tr key={product.id} className="border-b last:border-b-0 hover:bg-violet-50/40">
                <td className="px-6 py-4">
                  <Link href={`/products/${product.id}`} className="font-bold text-slate-900 hover:text-violet-600">
                    {product.name}
                  </Link>
                  {product.brand && <div className="mt-1 text-sm text-slate-500">{product.brand}</div>}
                </td>
                <td className="px-6 py-4 text-slate-600">{product.category || "—"}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    product.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : product.status === "archived"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-amber-100 text-amber-700"
                  }`}>
                    {product.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/products/${product.id}`} className="font-bold text-violet-700 hover:underline">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={currentPage}
        pageSize={pageSize}
        totalItems={products.length}
        itemLabel="products"
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}
