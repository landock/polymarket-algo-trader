import React from 'react';
import type { LimitOrder } from '../../storage/limit-orders';

interface LimitOrdersListProps {
  orders: LimitOrder[];
  mode: 'pending' | 'history';
  formatDate: (timestamp: number) => string;
  formatPrice: (price: number) => string;
  getStatusBadge: (status: string) => string;
  onCancel: (orderId: string) => void;
  onDelete: (orderId: string) => void;
}

export default function LimitOrdersList({
  orders,
  mode,
  formatDate,
  formatPrice,
  getStatusBadge,
  onCancel,
  onDelete
}: LimitOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        {mode === 'pending' ? 'No pending limit orders' : 'No order history'}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {orders.map(order => (
        <div
          key={order.id}
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                {order.marketQuestion || order.tokenId.slice(0, 16) + '...'}
              </div>
              {order.outcome && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  Outcome: {order.outcome}
                </div>
              )}
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Created: {formatDate(order.createdAt)}
              </div>
              {mode === 'history' && order.filledAt && (
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Filled: {formatDate(order.filledAt)}
                </div>
              )}
              {mode === 'history' && order.cancelledAt && (
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Cancelled: {formatDate(order.cancelledAt)}
                </div>
              )}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {getStatusBadge(order.status)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Side</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: order.side === 'BUY' ? '#10b981' : '#ef4444'
              }}>
                {order.side}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Size</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{order.size}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Limit Price</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{formatPrice(order.limitPrice)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                {mode === 'history' && order.filledPrice ? 'Filled Price' : 'Total'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                {mode === 'history' && order.filledPrice
                  ? formatPrice(order.filledPrice)
                  : formatPrice(order.size * order.limitPrice)}
              </div>
            </div>
          </div>

          {mode === 'pending' && order.clobOrderId && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
              CLOB Order ID: {order.clobOrderId.slice(0, 16)}...
            </div>
          )}

          {mode === 'history' && order.error && (
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#c33'
            }}>
              Error: {order.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {mode === 'pending' ? (
              <button
                onClick={() => onCancel(order.id)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => onDelete(order.id)}
                style={{
                  background: '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
