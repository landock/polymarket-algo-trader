/**
 * Order History Component
 *
 * Displays completed and cancelled orders with execution details
 */

import React, { useState, useEffect } from 'react';
import type { AlgoOrder } from '../../shared/types';

export default function OrderHistory() {
  const [historicalOrders, setHistoricalOrders] = useState<AlgoOrder[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadOrderHistory();
  }, []);

  const loadOrderHistory = async () => {
    try {
      const result = await chrome.storage.local.get('algo_orders');
      const orders = result.algo_orders || [];

      // Filter completed and cancelled orders
      const historical = orders.filter((o: AlgoOrder) =>
        o.status === 'COMPLETED' || o.status === 'CANCELLED'
      ).sort((a: AlgoOrder, b: AlgoOrder) => b.updatedAt - a.updatedAt); // Most recent first

      setHistoricalOrders(historical);
    } catch (error) {
      console.error('Failed to load order history:', error);
    }
  };

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'TRAILING_STOP': return '📈 Trailing Stop';
      case 'STOP_LOSS': return '🛑 Stop-Loss';
      case 'TAKE_PROFIT': return '🎯 Take-Profit';
      case 'TWAP': return '⏱️ TWAP';
      default: return type;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAveragePrice = (order: AlgoOrder): number | null => {
    if (!order.executionHistory || order.executionHistory.length === 0) {
      return null;
    }

    const totalValue = order.executionHistory.reduce(
      (sum, exec) => sum + (exec.price * exec.size),
      0
    );
    const totalSize = order.executionHistory.reduce(
      (sum, exec) => sum + exec.size,
      0
    );

    return totalSize > 0 ? totalValue / totalSize : null;
  };

  if (historicalOrders.length === 0) {
    return (
      <div style={{
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '6px',
        border: '1px dashed #d1d5db',
        textAlign: 'center',
        fontSize: '13px',
        color: '#6b7280'
      }}>
        No order history yet
      </div>
    );
  }

  return (
    <div>
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
      >
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          Order History ({historicalOrders.length})
        </div>
        <span style={{ fontSize: '16px', color: '#6b7280' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {historicalOrders.map((order) => {
            const avgPrice = calculateAveragePrice(order);

            return (
              <div
                key={order.id}
                style={{
                  padding: '10px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>
                    {getOrderTypeLabel(order.type)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: order.status === 'COMPLETED' ? '#10b981' : '#6b7280',
                    padding: '2px 6px',
                    background: order.status === 'COMPLETED' ? '#d1fae5' : '#f3f4f6',
                    borderRadius: '3px'
                  }}>
                    {order.status}
                  </div>
                </div>

                {/* Details */}
                <div style={{ color: '#6b7280', marginBottom: '6px' }}>
                  <span style={{
                    color: order.side === 'BUY' ? '#10b981' : '#ef4444',
                    fontWeight: 500
                  }}>
                    {order.side}
                  </span>
                  {' '}
                  {order.size.toFixed(2)} shares
                </div>

                {/* Execution Info */}
                {order.executionHistory && order.executionHistory.length > 0 && (
                  <div style={{
                    padding: '6px 8px',
                    background: '#f0fdf4',
                    borderRadius: '4px',
                    marginBottom: '6px'
                  }}>
                    <div style={{ color: '#15803d', fontSize: '11px', marginBottom: '2px' }}>
                      ✓ Executed: {order.executedSize?.toFixed(2) || order.size.toFixed(2)} shares
                    </div>
                    {avgPrice && (
                      <div style={{ color: '#15803d', fontSize: '11px' }}>
                        Avg Price: ${avgPrice.toFixed(4)}
                      </div>
                    )}
                    {order.executionHistory.length > 1 && (
                      <div style={{ color: '#15803d', fontSize: '11px' }}>
                        {order.executionHistory.length} executions
                      </div>
                    )}
                  </div>
                )}

                {/* Type-specific details */}
                {order.type === 'TRAILING_STOP' && order.params && 'trailPercent' in order.params && (
                  <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}>
                    Trail: {order.params.trailPercent}%
                    {order.highestPrice && ` | Peak: $${order.highestPrice.toFixed(4)}`}
                    {order.lowestPrice && ` | Bottom: $${order.lowestPrice.toFixed(4)}`}
                  </div>
                )}

                {/* Timestamp */}
                <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '4px' }}>
                  {formatTimestamp(order.updatedAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
