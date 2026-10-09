"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
};

export default function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  itemLabel = "rows",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);
  const visiblePages = Array.from(new Set([1, safePage - 1, safePage, safePage + 1, totalPages].filter((number) => number >= 1 && number <= totalPages))).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-800">{start}–{end}</span> of{" "}
          <span className="font-semibold text-slate-800">{totalItems}</span> {itemLabel}
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">Rows per page</span>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav aria-label="Table pagination" className="flex items-center gap-1 self-end sm:self-auto">
        <button
          type="button"
          aria-label="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={17} />
        </button>
        {visiblePages.map((item, index) => (
          <span key={item} className="contents">
            {index > 0 && item - visiblePages[index - 1] > 1 && (
              <span className="px-1 text-sm text-slate-400" aria-hidden="true">…</span>
            )}
            <button
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === safePage ? "page" : undefined}
              onClick={() => onPageChange(item)}
              className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition ${item === safePage ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {item}
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={17} />
        </button>
      </nav>
    </div>
  );
}
