/**
 * Order History Component
 *
 * Displays comprehensive order execution history with filtering and sorting
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { OrderHistoryEntry } from '../../shared/types';
import { getOrderHistory } from '../../storage/order-history';
import OrderHistoryFilters from './OrderHistoryFilters';
import OrderHistoryTable from './OrderHistoryTable';
import { buildOrderHistoryCsv, formatTimestamp, SortField, SortOrder } from './order-history-utils';

export default function OrderHistory() {
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter states
  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({});
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL');
  const [sideFilter, setSideFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sort states
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadOrderHistory();
  }, []);

  const loadOrderHistory = async () => {
    try {
      const history = await getOrderHistory();
      setOrders(history);
    } catch (error) {
      console.error('Failed to load order history:', error);
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Apply date filter
    if (dateFilter.start) {
      const startTime = new Date(dateFilter.start).getTime();
      filtered = filtered.filter(o => o.timestamp >= startTime);
    }
    if (dateFilter.end) {
      const endTime = new Date(dateFilter.end).getTime() + 86400000; // End of day
      filtered = filtered.filter(o => o.timestamp < endTime);
    }

    // Apply order type filter
    if (orderTypeFilter !== 'ALL') {
      filtered = filtered.filter(o => o.orderType === orderTypeFilter);
    }

    // Apply side filter
    if (sideFilter !== 'ALL') {
      filtered = filtered.filter(o => o.side === sideFilter);
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'timestamp':
          compareValue = a.timestamp - b.timestamp;
          break;
        case 'orderType':
          compareValue = a.orderType.localeCompare(b.orderType);
          break;
        case 'side':
          compareValue = a.side.localeCompare(b.side);
          break;
        case 'size':
          compareValue = a.size - b.size;
          break;
        case 'price':
          compareValue = a.price - b.price;
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [orders, dateFilter, orderTypeFilter, sideFilter, statusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setDateFilter({});
    setOrderTypeFilter('ALL');
    setSideFilter('ALL');
    setStatusFilter('ALL');
  };

  const exportToCSV = () => {
    const { csvContent, filename } = buildOrderHistoryCsv(filteredOrders);

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (orders.length === 0) {
    return (
      <div
        className="rounded-[10px] border border-dashed border-[#e2dbd1] bg-[#fff9f2] p-3 text-center text-sm text-[#6b7a86]"
        data-cy="order-history-empty"
      >
        No order history yet
      </div>
    );
  }

  return (
    <div data-cy="order-history">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex cursor-pointer items-center justify-between rounded-[10px] border border-[#e2dbd1] bg-[#fff9f2] p-3 ${isExpanded ? 'mb-3' : ''}`}
        data-cy="order-history-toggle"
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a6a50]">
          Order History ({filteredOrders.length}{orders.length !== filteredOrders.length ? ` of ${orders.length}` : ''})
        </div>
        <span className="text-base text-[#6b7a86]">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div>
          <OrderHistoryFilters
            dateFilter={dateFilter}
            orderTypeFilter={orderTypeFilter}
            sideFilter={sideFilter}
            statusFilter={statusFilter}
            onDateFilterChange={setDateFilter}
            onOrderTypeFilterChange={setOrderTypeFilter}
            onSideFilterChange={setSideFilter}
            onStatusFilterChange={setStatusFilter}
            onClearFilters={clearFilters}
            onExportCsv={exportToCSV}
            exportCount={filteredOrders.length}
          />

          <OrderHistoryTable
            orders={filteredOrders}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            formatTimestamp={formatTimestamp}
          />
        </div>
      )}
    </div>
  );
}
