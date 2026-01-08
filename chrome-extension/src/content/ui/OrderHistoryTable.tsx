import React from 'react';
import type { OrderHistoryEntry } from '../../shared/types';
import type { SortField, SortOrder } from './order-history-utils';
import { getOrderTypeLabel, getSortIcon } from './order-history-utils';

interface OrderHistoryTableProps {
  orders: OrderHistoryEntry[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  formatTimestamp: (timestamp: number) => string;
}

export default function OrderHistoryTable({
  orders,
  sortField,
  sortOrder,
  onSort,
  formatTimestamp
}: OrderHistoryTableProps) {
  return (
    <div
      className="max-h-96 overflow-y-auto rounded border border-[#e2dbd1]"
      data-cy="order-history-list"
    >
      <div className="sticky top-0 grid grid-cols-6 gap-2 border-b border-[#e2dbd1] bg-[#fff9f2] p-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a6a50]">
        <div
          onClick={() => onSort('timestamp')}
          className="col-span-2 cursor-pointer select-none"
        >
          Time {getSortIcon('timestamp', sortField, sortOrder)}
        </div>
        <div
          onClick={() => onSort('orderType')}
          className="cursor-pointer select-none"
        >
          Type {getSortIcon('orderType', sortField, sortOrder)}
        </div>
        <div
          onClick={() => onSort('side')}
          className="cursor-pointer select-none"
        >
          Side {getSortIcon('side', sortField, sortOrder)}
        </div>
        <div
          onClick={() => onSort('size')}
          className="cursor-pointer select-none text-right"
        >
          Size {getSortIcon('size', sortField, sortOrder)}
        </div>
        <div
          onClick={() => onSort('price')}
          className="cursor-pointer select-none text-right"
        >
          Price {getSortIcon('price', sortField, sortOrder)}
        </div>
        <div className="text-center">Status</div>
      </div>

      {orders.length === 0 ? (
        <div className="p-5 text-center text-xs text-[#6b7a86]">
          No orders match the current filters
        </div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="grid grid-cols-6 gap-2 border-b border-[#f1e7db] bg-white p-2 text-xs text-[#1f2a33]"
            data-cy={`order-history-${order.id}`}
          >
            <div className="col-span-2 overflow-hidden text-ellipsis">
              <div className="font-medium">{formatTimestamp(order.timestamp)}</div>
              {order.marketQuestion && (
                <div className="mt-0.5 truncate text-xs text-[#6b7a86]">
                  {order.marketQuestion}
                </div>
              )}
            </div>
            <div>{getOrderTypeLabel(order)}</div>
            <div className={order.side === 'BUY' ? 'font-semibold text-[#7b8f5a]' : 'font-semibold text-[#b24b4b]'}>
              {order.side}
            </div>
            <div className="text-right">{order.size.toFixed(2)}</div>
            <div className="text-right">
              <div>${order.price.toFixed(4)}</div>
              {order.executedPrice && order.executedPrice !== order.price && (
                <div className="text-xs text-[#6b7a86]">
                  ${order.executedPrice.toFixed(4)}
                </div>
              )}
            </div>
            <div className="text-center">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  order.status === 'EXECUTED'
                    ? 'bg-[#f1f2e6] text-[#7b8f5a]'
                    : order.status === 'FAILED'
                    ? 'bg-[#f6ecec] text-[#8b3a3a]'
                    : order.status === 'CANCELLED'
                        ? 'bg-[#efe9e1] text-[#6b7a86]'
                        : 'bg-[#f6f0e6] text-[#7a5a3a]'
                }`}
              >
                {order.status}
              </span>
              {order.error && (
                <div className="mt-0.5 text-xs text-[#8b3a3a]" title={order.error}>
                  Error
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
