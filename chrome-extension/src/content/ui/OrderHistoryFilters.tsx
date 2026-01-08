import React from 'react';
interface OrderHistoryFiltersProps {
  dateFilter: { start?: string; end?: string };
  orderTypeFilter: string;
  sideFilter: string;
  statusFilter: string;
  onDateFilterChange: (next: { start?: string; end?: string }) => void;
  onOrderTypeFilterChange: (value: string) => void;
  onSideFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onExportCsv: () => void;
  exportCount: number;
}

export default function OrderHistoryFilters({
  dateFilter,
  orderTypeFilter,
  sideFilter,
  statusFilter,
  onDateFilterChange,
  onOrderTypeFilterChange,
  onSideFilterChange,
  onStatusFilterChange,
  onClearFilters,
  onExportCsv,
  exportCount
}: OrderHistoryFiltersProps) {
  return (
    <div className="mb-3 rounded-[10px] border border-[#e2dbd1] bg-white p-3">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a6a50]">Filters</div>

      <div className="mb-2">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b7a86]">Date Range</div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFilter.start || ''}
            onChange={(e) => onDateFilterChange({ ...dateFilter, start: e.target.value })}
            className="flex-1 rounded border border-[#e2dbd1] bg-[#fbf9f6] px-2 py-1 text-xs text-[#1f2a33]"
          />
          <input
            type="date"
            value={dateFilter.end || ''}
            onChange={(e) => onDateFilterChange({ ...dateFilter, end: e.target.value })}
            className="flex-1 rounded border border-[#e2dbd1] bg-[#fbf9f6] px-2 py-1 text-xs text-[#1f2a33]"
          />
        </div>
      </div>

      <div className="mb-2">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b7a86]">Order Type</div>
        <select
          value={orderTypeFilter}
          onChange={(e) => onOrderTypeFilterChange(e.target.value)}
          className="w-full rounded border border-[#e2dbd1] bg-[#fbf9f6] px-2 py-1 text-xs text-[#1f2a33]"
        >
          <option value="ALL">All Types</option>
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
          <option value="ALGO">Algorithmic</option>
        </select>
      </div>

      <div className="mb-2">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b7a86]">Side</div>
        <select
          value={sideFilter}
          onChange={(e) => onSideFilterChange(e.target.value)}
          className="w-full rounded border border-[#e2dbd1] bg-[#fbf9f6] px-2 py-1 text-xs text-[#1f2a33]"
        >
          <option value="ALL">All Sides</option>
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
      </div>

      <div className="mb-2">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b7a86]">Status</div>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-full rounded border border-[#e2dbd1] bg-[#fbf9f6] px-2 py-1 text-xs text-[#1f2a33]"
        >
          <option value="ALL">All Statuses</option>
          <option value="EXECUTED">Executed</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClearFilters}
          className="flex flex-1 items-center justify-center rounded border border-[#e2dbd1] bg-[#efe9e1] px-2 py-1 text-xs font-medium text-[#1f2a33] transition hover:bg-[#e7dccf]"
        >
          Clear Filters
        </button>
        <button
          onClick={onExportCsv}
          disabled={exportCount === 0}
          className={`flex flex-1 items-center justify-center rounded border px-2 py-1 text-xs font-medium ${
            exportCount === 0
              ? 'cursor-not-allowed border-[#e2dbd1] bg-[#efe9e1] text-[#9aa5b1]'
              : 'border-[#1f2a33] bg-[#1f2a33] text-[#fbf9f6] hover:bg-[#2a3641]'
          }`}
          data-cy="export-csv-button"
        >
          Export to CSV ({exportCount})
        </button>
      </div>
    </div>
  );
}
