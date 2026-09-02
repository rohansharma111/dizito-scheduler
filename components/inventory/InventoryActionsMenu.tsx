"use client";

import { useEffect, useRef, useState } from "react";

type InventoryItem = {
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
};

type Props = {
  item: InventoryItem;
  onRemove: () => void;
  onAdjust: () => void;
  onReserve: () => void;
  onRelease: () => void;
};

export default function InventoryActionsMenu({
  item,
  onRemove,
  onAdjust,
  onReserve,
  onRelease,
}: Props) {
  const [open, setOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);

      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleAction(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-lg
          border
          border-gray-300
          bg-white
          px-3
          py-1.5
          text-sm
          font-medium
          text-gray-700
          hover:bg-gray-50
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      >
        Actions
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          className="
            absolute
            right-0
            z-40
            mt-2
            w-52
            origin-top-right
            rounded-xl
            border
            border-gray-200
            bg-white
            p-1
            shadow-lg
          "
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onRemove)}
            className="
              block
              w-full
              rounded-lg
              px-3
              py-2
              text-left
              text-sm
              text-gray-700
              hover:bg-gray-50
            "
          >
            Remove Stock
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onAdjust)}
            className="
              block
              w-full
              rounded-lg
              px-3
              py-2
              text-left
              text-sm
              text-gray-700
              hover:bg-gray-50
            "
          >
            Adjust Stock
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={item.quantity_available <= 0}
            onClick={() => handleAction(onReserve)}
            className="
              block
              w-full
              rounded-lg
              px-3
              py-2
              text-left
              text-sm
              text-gray-700
              hover:bg-gray-50
              disabled:cursor-not-allowed
              disabled:text-gray-300
              disabled:hover:bg-white
            "
          >
            Reserve Stock
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={item.quantity_reserved <= 0}
            onClick={() => handleAction(onRelease)}
            className="
              block
              w-full
              rounded-lg
              px-3
              py-2
              text-left
              text-sm
              text-gray-700
              hover:bg-gray-50
              disabled:cursor-not-allowed
              disabled:text-gray-300
              disabled:hover:bg-white
            "
          >
            Release Reservation
          </button>
        </div>
      )}
    </div>
  );
}
