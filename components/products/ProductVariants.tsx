"use client";

import { useState } from "react";

import VariantModal from "./VariantModal";
import DeleteVariantDialog from "./DeleteVariantDialog";
import TablePagination from "@/components/dizito/TablePagination";

interface Variant {
  id: number;
  product_id: number;
  name?: string | null;
  sku: string;
  barcode?: string | null;
  price?: number | null;
  mrp?: number | null;
  cost_price?: number | null;
  weight?: number | null;
  status: string;
}

interface ProductVariantsProps {
  productId: number;
  initialVariants: Variant[];
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `₹${(Number(value) / 100).toFixed(2)}`;
}

export default function ProductVariants({
  productId,
  initialVariants,
}: ProductVariantsProps) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [variantsPage, setVariantsPage] = useState(1);
  const [variantsPageSize, setVariantsPageSize] = useState(25);
  const currentVariantsPage = Math.min(variantsPage, Math.max(1, Math.ceil(variants.length / variantsPageSize)));
  const paginatedVariants = variants.slice((currentVariantsPage - 1) * variantsPageSize, currentVariantsPage * variantsPageSize);

  const [showModal, setShowModal] = useState(false);

  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);

  const [deletingVariant, setDeletingVariant] = useState<Variant | null>(null);

  const [loading, setLoading] = useState(false);

  async function refreshVariants() {
    try {
      setLoading(true);

      const response = await fetch(`/api/products/${productId}/variants`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVariants(data.variants ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingVariant(null);
    setShowModal(true);
  }

  function openEdit(variant: Variant) {
    setEditingVariant(variant);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingVariant(null);
  }

  async function handleSaved() {
    closeModal();
    await refreshVariants();
  }

  async function handleDeleted() {
    setDeletingVariant(null);
    await refreshVariants();
  }

  return (
    <>
      <section className="bg-white border rounded-xl overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Variants</h2>

            <p className="text-sm text-gray-500 mt-1">
              Manage the sellable versions of this product.
            </p>
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#c7f36b] px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-[#9fda35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:w-auto"
          >
            + Add Variant
          </button>
        </div>

        {variants.length === 0 ? (
          <div className="border-t py-12 text-center">
            <p className="font-medium">No variants yet</p>

            <p className="text-sm text-gray-500 mt-1">
              Add a variant such as size, color or pack.
            </p>

            <button
              type="button"
              onClick={openAdd}
              className="
                mt-5
                text-blue-600
                font-medium
                hover:underline
              "
            >
              Add your first variant
            </button>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto overscroll-x-contain"><table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-t border-b bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Variant
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    SKU
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Price
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    MRP
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>

                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedVariants.map((variant) => (
                  <tr key={variant.id} className="border-b last:border-b-0">
                    <td className="px-6 py-4 font-medium">
                      {variant.name || "Default"}
                    </td>

                    <td className="px-6 py-4 text-gray-600">{variant.sku}</td>

                    <td className="px-6 py-4">{formatMoney(variant.price)}</td>

                    <td className="px-6 py-4 text-gray-600">
                      {formatMoney(variant.mrp)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`
                          inline-flex
                          px-2.5
                          py-1
                          rounded-full
                          text-xs
                          font-medium
                          ${
                            variant.status === "active"
                              ? "bg-green-100 text-green-700"
                              : variant.status === "archived"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-yellow-100 text-yellow-700"
                          }
                        `}
                      >
                        {variant.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(variant)}
                          className="
                            text-sm
                            font-medium
                            text-blue-600
                            hover:underline
                          "
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingVariant(variant)}
                          className="
                            text-sm
                            font-medium
                            text-red-600
                            hover:underline
                          "
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={currentVariantsPage}
            pageSize={variantsPageSize}
            totalItems={variants.length}
            itemLabel="variants"
            onPageChange={setVariantsPage}
            onPageSizeChange={(size) => { setVariantsPageSize(size); setVariantsPage(1); }}
          />
        )}

        {loading && (
          <div className="px-6 py-3 border-t text-sm text-gray-500">
            Updating variants...
          </div>
        )}
      </section>

      {showModal && (
        <VariantModal
          productId={productId}
          variant={editingVariant}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {deletingVariant && (
        <DeleteVariantDialog
          productId={productId}
          variantId={deletingVariant.id}
          variantName={deletingVariant.name}
          onClose={() => setDeletingVariant(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
