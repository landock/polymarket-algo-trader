/**
 * Active Orders List Component
 *
 * Displays all active algorithmic orders with their current status
 */

import React from 'react';
import type { AlgoOrder } from '../../shared/types';

interface ActiveOrdersListProps {
  orders: AlgoOrder[];
  onPause?: (orderId: string) => void;
  onResume?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
}

export default function ActiveOrdersList({
  orders,
  onPause,
  onResume,
  onCancel
}: ActiveOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div style={{
        padding: '16px',
        textAlign: 'center',
        background: '#f9fafb',
        borderRadius: '6px',
        border: '1px dashed #d1d5db'
      }}>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
          No active algo orders
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          Create your first algorithmic order to get started
        </div>
      </div>
    );
  }

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'TRAILING_STOP': return '📈 Trailing Stop';
      case 'STOP_LOSS': return '🛑 Stop-Loss';
      case 'TAKE_PROFIT': return '🎯 Take-Profit';
      case 'TWAP': return '⏱️ TWAP';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#7b8f5a';
      case 'PAUSED': return '#b07a4a';
      case 'COMPLETED': return '#6b7280';
      case 'CANCELLED': return '#b24b4b';
      default: return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="active-orders-list" data-cy="active-orders-list">
      {orders.map((order) => (
        <div
          key={order.id}
          style={{
            padding: '12px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '8px'
          }}
          data-cy={`algo-order-${order.id}`}
        >
          {/* Order Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>
              {getOrderTypeLabel(order.type)}
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: getStatusColor(order.status),
              padding: '2px 8px',
              background: `${getStatusColor(order.status)}22`,
              borderRadius: '4px'
            }}>
              {order.status}
            </div>
          </div>

          {/* Order Details */}
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: 500 }}>Side:</span>{' '}
              <span style={{ color: order.side === 'BUY' ? '#7b8f5a' : '#b24b4b' }}>
                {order.side}
              </span>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: 500 }}>Size:</span> {order.size.toFixed(2)} shares
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: 500 }}>Token:</span>{' '}
              <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                {order.tokenId.slice(0, 8)}...
              </span>
            </div>
            {order.entryPrice && (
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 500 }}>Entry:</span> ${order.entryPrice.toFixed(2)}
              </div>
            )}
          </div>

          {/* Type-Specific Info */}
          {order.type === 'TRAILING_STOP' && order.params && 'trailPercent' in order.params && (
            <div style={{
              fontSize: '11px',
              color: '#8a6a50',
              background: '#fff9f2',
              border: '1px solid #e2dbd1',
              padding: '6px 8px',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              Trail: {order.params.trailPercent}%
              {order.highestPrice && ` | Peak: $${order.highestPrice.toFixed(2)}`}
              {order.lowestPrice && ` | Bottom: $${order.lowestPrice.toFixed(2)}`}
            </div>
          )}

          {order.type === 'TWAP' && order.params && 'durationMinutes' in order.params && (
            <div style={{
              fontSize: '11px',
              color: '#8a6a50',
              background: '#fff9f2',
              border: '1px solid #e2dbd1',
              padding: '6px 8px',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              Duration: {order.params.durationMinutes}min |
              Executed: {order.executedSize?.toFixed(2) || 0} / {order.size.toFixed(2)}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {order.status === 'ACTIVE' && onPause && (
              <button
                onClick={() => onPause(order.id)}
                data-cy={`algo-order-pause-${order.id}`}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '11px',
                  background: 'transparent',
                  color: '#b07a4a',
                  border: '1px solid #b07a4a'
                }}
              >
                Pause
              </button>
            )}
            {order.status === 'PAUSED' && onResume && (
              <button
                onClick={() => onResume(order.id)}
                data-cy={`algo-order-resume-${order.id}`}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '11px',
                  background: 'transparent',
                  color: '#7b8f5a',
                  border: '1px solid #7b8f5a'
                }}
              >
                Resume
              </button>
            )}
            {onCancel && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
              <button
                onClick={() => onCancel(order.id)}
                data-cy={`algo-order-cancel-${order.id}`}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '11px',
                  background: 'transparent',
                  color: '#b24b4b',
                  border: '1px solid #b24b4b'
                }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Creation Timestamp */}
          <div style={{
            fontSize: '10px',
            color: '#9ca3af',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #f3f4f6'
          }}>
            Created: {formatTimestamp(order.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
