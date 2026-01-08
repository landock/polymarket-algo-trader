/**
 * Order Preview Component
 *
 * Shows a confirmation dialog before creating an order
 */

import React from 'react';
import type { AlgoOrderFormData } from './AlgoOrderForm';

interface OrderPreviewProps {
  order: AlgoOrderFormData;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function OrderPreview({ order, onConfirm, onCancel }: OrderPreviewProps) {
  const getOrderTypeLabel = () => {
    switch (order.type) {
      case 'TRAILING_STOP': return '📈 Trailing Stop';
      case 'STOP_LOSS': return '🛑 Stop-Loss / Take-Profit';
      case 'TAKE_PROFIT': return '🎯 Take-Profit';
      case 'TWAP': return '⏱️ TWAP';
      default: return order.type;
    }
  };

  const calculateTWAPSlices = () => {
    if (order.type !== 'TWAP' || !order.durationMinutes || !order.intervalMinutes) {
      return null;
    }
    const slices = Math.ceil(order.durationMinutes / order.intervalMinutes);
    const sliceSize = order.size / slices;
    return { slices, sliceSize };
  };

  const twapInfo = calculateTWAPSlices();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001
    }} data-cy="order-preview">
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }} data-cy="order-preview-card">
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: 600,
          color: '#111827'
        }}>
          Confirm Order
        </h3>

        <div style={{
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {/* Order Type */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Order Type
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
              {getOrderTypeLabel()}
            </div>
          </div>

          {/* Side & Size */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Side
              </div>
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                color: order.side === 'BUY' ? '#7b8f5a' : '#b24b4b'
              }}>
                {order.side}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Size
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                {order.size.toFixed(2)} shares
              </div>
            </div>
          </div>

          {/* Token ID */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Token ID
            </div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#374151',
              wordBreak: 'break-all'
            }}>
              {order.tokenId.length > 20 ? `${order.tokenId.slice(0, 20)}...` : order.tokenId}
            </div>
          </div>

          {/* Type-specific details */}
          {order.type === 'TRAILING_STOP' && (
            <div style={{
              padding: '12px',
              background: '#ede9fe',
              borderRadius: '6px',
              marginTop: '12px'
            }}>
              <div style={{ fontSize: '12px', color: '#5b21b6', marginBottom: '4px' }}>
                Trail Percentage
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#5b21b6' }}>
                {order.trailPercent}%
              </div>
              {order.triggerPrice && (
                <>
                  <div style={{ fontSize: '12px', color: '#5b21b6', marginTop: '8px', marginBottom: '4px' }}>
                    Trigger Price
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#5b21b6' }}>
                    ${order.triggerPrice.toFixed(4)}
                  </div>
                </>
              )}
            </div>
          )}

          {(order.type === 'STOP_LOSS' || order.type === 'TAKE_PROFIT') && (
            <div style={{
              padding: '12px',
              background: '#f6f0e6',
              borderRadius: '8px',
              marginTop: '12px'
            }}>
              {order.stopLossPrice && (
                <>
                  <div style={{ fontSize: '12px', color: '#7a5a3a', marginBottom: '4px' }}>
                    Stop-Loss Price
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#7a5a3a', marginBottom: '8px' }}>
                    ${order.stopLossPrice.toFixed(4)}
                  </div>
                </>
              )}
              {order.takeProfitPrice && (
                <>
                  <div style={{ fontSize: '12px', color: '#7a5a3a', marginBottom: '4px' }}>
                    Take-Profit Price
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#7a5a3a' }}>
                    ${order.takeProfitPrice.toFixed(4)}
                  </div>
                </>
              )}
            </div>
          )}

          {order.type === 'TWAP' && twapInfo && (
            <div style={{
              padding: '12px',
              background: '#f6f0e6',
              borderRadius: '8px',
              marginTop: '12px'
            }}>
              <div style={{ fontSize: '12px', color: '#7a5a3a', marginBottom: '4px' }}>
                Duration
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#7a5a3a', marginBottom: '8px' }}>
                {order.durationMinutes} minutes
              </div>

              <div style={{ fontSize: '12px', color: '#7a5a3a', marginBottom: '4px' }}>
                Interval
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#7a5a3a', marginBottom: '8px' }}>
                {order.intervalMinutes} minutes
              </div>

              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #d7c7ab',
                fontSize: '12px',
                color: '#7a5a3a'
              }}>
                Will execute <strong>{twapInfo.slices} slices</strong> of{' '}
                <strong>{twapInfo.sliceSize.toFixed(2)} shares</strong> each
              </div>
            </div>
          )}
        </div>

        {/* Warning Box */}
        <div style={{
          padding: '12px',
          background: '#f6f0e6',
          border: '1px solid #d7c7ab',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#7a5a3a'
        }}>
          <strong>⚠️ Important:</strong> This order will be monitored and executed automatically
          when conditions are met. Make sure your parameters are correct.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            data-cy="order-preview-cancel"
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            data-cy="order-preview-confirm"
            style={{
              flex: 1,
              padding: '10px',
              background: '#1f2a33',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Confirm & Create
          </button>
        </div>
      </div>
    </div>
  );
}
