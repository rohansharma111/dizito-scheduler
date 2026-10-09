"use client";

import { useEffect, useState } from "react";
import TablePagination from "@/components/dizito/TablePagination";

interface Movement {
  id: number;

  location_id: number;
  location_name: string;

  variant_id: number;
  variant_name: string | null;
  sku: string;

  product_id: number;
  product_name: string;

  movement_type: string;
  quantity: number;

  reference_type: string | null;
  reference_id: number | null;

  note: string | null;

  created_at: string;
}

interface InventoryMovementHistoryProps {
  locationId?: string;
  variantId?: number;
}

function formatMovementType(type: string) {
  switch (type) {
    case "in":
      return "Stock In";

    case "out":
      return "Stock Out";

    case "adjustment":
      return "Adjustment";

    case "reserve":
      return "Reservation";

    case "release":
      return "Release";

    default:
      return type;
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

export default function InventoryMovementHistory({
  locationId,
  variantId,
}: InventoryMovementHistoryProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [movementPage, setMovementPage] = useState(1);
  const [movementPageSize, setMovementPageSize] = useState(25);
  const currentMovementPage = Math.min(movementPage, Math.max(1, Math.ceil(movements.length / movementPageSize)));
  const paginatedMovements = movements.slice((currentMovementPage - 1) * movementPageSize, currentMovementPage * movementPageSize);

  useEffect(() => {
    async function loadMovements() {
      try {
        setLoading(true);
        setError("");
        setMovementPage(1);

        const params = new URLSearchParams();

        if (locationId && locationId !== "all") {
          params.set("locationId", locationId);
        }

        if (variantId) {
          params.set("variantId", String(variantId));
        }

        const query = params.toString();

        const response = await fetch(
          `/api/inventory/movements${query ? `?${query}` : ""}`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load movement history");
        }

        setMovements(data.movements ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load movement history",
        );
      } finally {
        setLoading(false);
      }
    }

    loadMovements();
  }, [locationId, variantId]);

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Movement History</h2>

        <p className="text-sm text-gray-500 mt-1">
          Track every inventory movement and reservation.
        </p>
      </div>

      {loading ? (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          Loading movement history...
        </div>
      ) : error ? (
        <div className="px-6 py-12 text-center">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      ) : movements.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="text-3xl mb-2">📋</div>

          <div className="font-medium">No movements yet</div>

          <div className="text-sm text-gray-500 mt-1">
            Inventory movements will appear here.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Date
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Product
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  SKU
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Location
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Movement
                </th>

                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Qty
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Reference
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Note
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedMovements.map((movement) => (
                <tr
                  key={movement.id}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(movement.created_at)}
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-medium">{movement.product_name}</div>

                    {movement.variant_name && (
                      <div className="text-sm text-gray-500 mt-1">
                        {movement.variant_name}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {movement.sku}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {movement.location_name}
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {formatMovementType(movement.movement_type)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-semibold ${
                        movement.quantity > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {movement.reference_type
                      ? `${movement.reference_type}${
                          movement.reference_id
                            ? ` #${movement.reference_id}`
                            : ""
                        }`
                      : "—"}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate">{movement.note || "—"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={currentMovementPage}
          pageSize={movementPageSize}
          totalItems={movements.length}
          itemLabel="movements"
          onPageChange={setMovementPage}
          onPageSizeChange={(size) => { setMovementPageSize(size); setMovementPage(1); }}
        />
      )}
    </div>
  );
}
