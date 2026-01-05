/**
 * Order History Component
 *
 * Displays comprehensive order execution history with filtering and sorting
 */

import React, { useState, useEffect } from 'react';
import type { OrderHistoryEntry, AlgoOrderType } from '../../shared/types';
import { getOrderHistory } from '../../storage/order-history';

type SortField = 'timestamp' | 'orderType' | 'side' | 'size' | 'price';
type SortOrder = 'asc' | 'desc';

export default function OrderHistory() {
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderHistoryEntry[]>([]);
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

  useEffect(() => {
    applyFiltersAndSort();
  }, [orders, dateFilter, orderTypeFilter, sideFilter, statusFilter, sortField, sortOrder]);

  const loadOrderHistory = async () => {
    try {
      const history = await getOrderHistory();
      setOrders(history);
    } catch (error) {
      console.error('Failed to load order history:', error);
    }
  };

  const applyFiltersAndSort = () => {
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

    setFilteredOrders(filtered);
  };

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

  const getOrderTypeLabel = (entry: OrderHistoryEntry): string => {
    if (entry.orderType === 'ALGO' && entry.algoType) {
      switch (entry.algoType) {
        case 'TRAILING_STOP': return 'Trailing Stop';
        case 'STOP_LOSS': return 'Stop-Loss';
        case 'TAKE_PROFIT': return 'Take-Profit';
        case 'TWAP': return 'TWAP';
        default: return entry.algoType;
      }
    }
    return entry.orderType;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (orders.length === 0) {
    return (
      <div style={{
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '6px',
        border: '1px dashed #d1d5db',
        textAlign: 'center',
        fontSize: '13px',
        color: '#6b7280'
      }} data-cy="order-history-empty">
        No order history yet
      </div>
    );
  }

  return (
    <div data-cy="order-history">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: isExpanded ? '12px' : 0
        }}
        data-cy="order-history-toggle"
      >
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          Order History ({filteredOrders.length}{orders.length !== filteredOrders.length ? ` of ${orders.length}` : ''})
        </div>
        <span style={{ fontSize: '16px', color: '#6b7280' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div>
          {/* Filters */}
          <div style={{
            padding: '12px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
              Filters
            </div>

            {/* Date Range */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Date Range</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  value={dateFilter.start || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                />
                <input
                  type="date"
                  value={dateFilter.end || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                />
              </div>
            </div>

            {/* Order Type Filter */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Order Type</div>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
              >
                <option value="ALL">All Types</option>
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="ALGO">Algorithmic</option>
              </select>
            </div>

            {/* Side Filter */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Side</div>
              <select
                value={sideFilter}
                onChange={(e) => setSideFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
              >
                <option value="ALL">All Sides</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Status</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="EXECUTED">Executed</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <button
              onClick={clearFilters}
              style={{
                width: '100%',
                padding: '6px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* Orders Table */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '6px'
          }} data-cy="order-history-list">
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 60px 80px 90px 90px',
              gap: '8px',
              padding: '8px',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              fontSize: '11px',
              fontWeight: 600,
              color: '#6b7280',
              position: 'sticky',
              top: 0
            }}>
              <div
                onClick={() => handleSort('timestamp')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Time {getSortIcon('timestamp')}
              </div>
              <div
                onClick={() => handleSort('orderType')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Type {getSortIcon('orderType')}
              </div>
              <div
                onClick={() => handleSort('side')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Side {getSortIcon('side')}
              </div>
              <div
                onClick={() => handleSort('size')}
                style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
              >
                Size {getSortIcon('size')}
              </div>
              <div
                onClick={() => handleSort('price')}
                style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
              >
                Price {getSortIcon('price')}
              </div>
              <div style={{ textAlign: 'center' }}>Status</div>
            </div>

            {/* Table Rows */}
            {filteredOrders.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                No orders match the current filters
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 60px 80px 90px 90px',
                    gap: '8px',
                    padding: '8px',
                    background: 'white',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '11px',
                    color: '#374151'
                  }}
                  data-cy={`order-history-${order.id}`}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 500 }}>{formatTimestamp(order.timestamp)}</div>
                    {order.marketQuestion && (
                      <div style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {order.marketQuestion}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '10px' }}>{getOrderTypeLabel(order)}</div>
                  <div style={{
                    fontWeight: 600,
                    color: order.side === 'BUY' ? '#10b981' : '#ef4444'
                  }}>
                    {order.side}
                  </div>
                  <div style={{ textAlign: 'right' }}>{order.size.toFixed(2)}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div>${order.price.toFixed(4)}</div>
                    {order.executedPrice && order.executedPrice !== order.price && (
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>
                        ${order.executedPrice.toFixed(4)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: order.status === 'EXECUTED' ? '#10b981' :
                             order.status === 'FAILED' ? '#ef4444' :
                             order.status === 'CANCELLED' ? '#6b7280' : '#f59e0b',
                      background: order.status === 'EXECUTED' ? '#d1fae5' :
                                 order.status === 'FAILED' ? '#fee2e2' :
                                 order.status === 'CANCELLED' ? '#f3f4f6' : '#fef3c7'
                    }}>
                      {order.status}
                    </span>
                    {order.error && (
                      <div style={{
                        fontSize: '9px',
                        color: '#ef4444',
                        marginTop: '2px'
                      }} title={order.error}>
                        Error
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
