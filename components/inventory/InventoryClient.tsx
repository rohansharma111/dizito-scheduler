"use client";

import { useMemo, useState } from "react";
import AddStockModal from "./AddStockModal";
import RemoveStockModal from "./RemoveStockModal";
import AdjustStockModal from "./AdjustStockModal";
import ReserveStockModal from "./ReserveStockModal";
import ReleaseStockModal from "./ReleaseStockModal";
import InventoryActionsMenu from "./InventoryActionsMenu";
import InventoryMovementHistory from "./InventoryMovementHistory";
import { DizitoCard, DizitoPage, DizitoPageHeader } from "@/components/dizito/DizitoUI";

interface InventoryItem {
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
}

interface Location {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface InventoryClientProps {
  initialInventory: InventoryItem[];
  locations: Location[];
}

interface InventoryVariant {
  variant_id: number;
  variant_name: string | null;
  sku: string;
  product_name: string;
}

export default function InventoryClient({
  initialInventory,
  locations,
}: InventoryClientProps) {
  const [inventory] = useState<InventoryItem[]>(initialInventory);

  const [search, setSearch] = useState("");

  const [locationId, setLocationId] = useState("all");

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesSearch =
        !query ||
        item.product_name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        (item.variant_name?.toLowerCase().includes(query) ?? false);

      const matchesLocation =
        locationId === "all" || String(item.location_id) === locationId;

      return matchesSearch && matchesLocation;
    });
  }, [inventory, search, locationId]);

  const totalOnHand = filteredInventory.reduce(
    (sum, item) => sum + Number(item.quantity_on_hand),
    0,
  );

  const totalReserved = filteredInventory.reduce(
    (sum, item) => sum + Number(item.quantity_reserved),
    0,
  );

  const totalAvailable = filteredInventory.reduce(
    (sum, item) => sum + Number(item.quantity_available),
    0,
  );

  const [showAddStock, setShowAddStock] = useState(false);

  const [removeStockItem, setRemoveStockItem] = useState<InventoryItem | null>(
    null,
  );

  const [adjustStockItem, setAdjustStockItem] = useState<InventoryItem | null>(
    null,
  );

  const [reserveStockItem, setReserveStockItem] =
    useState<InventoryItem | null>(null);

  const [releaseStockItem, setReleaseStockItem] =
    useState<InventoryItem | null>(null);

  const [variants, setVariants] = useState<InventoryVariant[]>([]);

  async function loadVariants() {
    const response = await fetch("/api/inventory/variants", {
      cache: "no-store",
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setVariants(data.variants ?? []);
    }
  }

  async function handleOpenAddStock() {
    await loadVariants();
    setShowAddStock(true);
  }

  return (
    <DizitoPage className="px-4 sm:px-6 space-y-5">
      {/* HEADER */}

      <DizitoPageHeader eyebrow="Commerce" title="Inventory" description="Manage stock levels, reservations, and availability across locations." />

      <div className="flex justify-start">

        <button
          type="button"
          onClick={handleOpenAddStock}
          className="dizito-button dizito-button-primary"
        >
          + Add Stock
        </button>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DizitoCard>
          <div className="text-sm text-gray-500">On Hand</div>

          <div className="text-3xl font-bold mt-2">{totalOnHand}</div>

          <div className="text-xs text-gray-500 mt-1">Physical units</div>
        </DizitoCard>

        <DizitoCard>
          <div className="text-sm text-gray-500">Reserved</div>

          <div className="text-3xl font-bold mt-2">{totalReserved}</div>

          <div className="text-xs text-gray-500 mt-1">Allocated to orders</div>
        </DizitoCard>

        <DizitoCard>
          <div className="text-sm text-gray-500">Available</div>

          <div className="text-3xl font-bold mt-2">{totalAvailable}</div>

          <div className="text-xs text-gray-500 mt-1">Available to sell</div>
        </DizitoCard>
      </div>

      {/* FILTERS */}

      <DizitoCard tone="soft">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product or SKU..."
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

          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className="
              border
              rounded-lg
              px-4
              py-3
              bg-white
              min-w-[220px]
              outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          >
            <option value="all">All locations</option>

            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      </DizitoCard>

      {/* TABLE */}

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="max-w-full overflow-x-auto overscroll-x-contain"><table className="w-full min-w-[680px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                  Product
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                  SKU
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                  Location
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                  On Hand
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                  Reserved
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                  Available
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="text-4xl mb-3">📦</div>

                    <div className="font-medium">No inventory found</div>

                    <div className="text-sm text-gray-500 mt-1">
                      Try changing your search or location filter.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr
                    key={item.id}
                    className="
                        border-b
                        last:border-b-0
                        hover:bg-gray-50
                        transition
                      "
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium">{item.product_name}</div>

                      {item.variant_name && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.variant_name}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-gray-600">{item.sku}</td>

                    <td className="px-6 py-4 text-gray-600">
                      {item.location_name}
                    </td>

                    <td className="px-6 py-4 text-right font-medium">
                      {item.quantity_on_hand}
                    </td>

                    <td className="px-6 py-4 text-right text-gray-600">
                      {item.quantity_reserved}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={`
                            inline-flex
                            px-2.5
                            py-1
                            rounded-full
                            text-sm
                            font-medium
                            ${
                              item.quantity_available === 0
                                ? "bg-red-100 text-red-700"
                                : item.quantity_available <= 5
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                            }
                          `}
                      >
                        {item.quantity_available}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <InventoryActionsMenu
                        item={item}
                        onRemove={() => setRemoveStockItem(item)}
                        onAdjust={() => setAdjustStockItem(item)}
                        onReserve={() => setReserveStockItem(item)}
                        onRelease={() => setReleaseStockItem(item)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InventoryMovementHistory locationId={locationId} />

      {removeStockItem && (
        <RemoveStockModal
          item={removeStockItem}
          locations={locations}
          onClose={() => setRemoveStockItem(null)}
          onSuccess={() => {
            setRemoveStockItem(null);
            window.location.reload();
          }}
        />
      )}
      {adjustStockItem && (
        <AdjustStockModal
          item={adjustStockItem}
          onClose={() => setAdjustStockItem(null)}
          onSuccess={() => {
            setAdjustStockItem(null);
            window.location.reload();
          }}
        />
      )}
      {reserveStockItem && (
        <ReserveStockModal
          item={reserveStockItem}
          onClose={() => setReserveStockItem(null)}
          onSuccess={() => {
            setReserveStockItem(null);
            window.location.reload();
          }}
        />
      )}
      {releaseStockItem && (
        <ReleaseStockModal
          item={releaseStockItem}
          onClose={() => setReleaseStockItem(null)}
          onSuccess={() => {
            setReleaseStockItem(null);
            window.location.reload();
          }}
        />
      )}
      {showAddStock && (
        <AddStockModal
          variants={variants}
          locations={locations}
          onClose={() => setShowAddStock(false)}
          onSaved={() => {
            setShowAddStock(false);
            window.location.reload();
          }}
        />
      )}
    </DizitoPage>
  );
}
