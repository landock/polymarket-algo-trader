/**
 * Position Card Component
 *
 * Displays a single position with action buttons
 */

import React from 'react';
import type { PolymarketPosition } from '../../shared/types/positions';

interface PositionCardProps {
  position: PolymarketPosition;
  onCreateOrder: (position: PolymarketPosition) => void;
  onQuickSell: (position: PolymarketPosition) => void;
  onViewMarket: (position: PolymarketPosition) => void;
  onRedeem: (position: PolymarketPosition) => void;
}

export default function PositionCard({
  position,
  onCreateOrder,
  onQuickSell,
  onViewMarket,
  onRedeem
}: PositionCardProps) {
  // Format numbers for display
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  const formatShares = (value: number) => value.toFixed(2);

  // Determine P&L color
  const pnlColor = position.cashPnl >= 0 ? '#7b8f5a' : '#b24b4b'; // warm green or red

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
      }}
    >
      {/* Header - Market Title & Outcome */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
          {position.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              background: position.outcome === 'Yes' ? '#f1f2e6' : '#f6ecec',
              color: position.outcome === 'Yes' ? '#7b8f5a' : '#8b3a3a',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {position.outcome}
          </span>
          {position.redeemable && (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: '#f6f0e6',
                color: '#7a5a3a',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              Redeemable
            </span>
          )}
        </div>
      </div>

      {/* Position Details Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '12px',
          padding: '8px',
          background: '#f9fafb',
          borderRadius: '6px',
        }}
      >
        {/* Size */}
        <div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
            Size
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {formatShares(position.size)} shares
          </div>
        </div>

        {/* Current Price */}
        <div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
            Current Price
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {formatCurrency(position.curPrice)}
          </div>
        </div>

        {/* Average Entry */}
        <div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
            Avg Entry
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {formatCurrency(position.avgPrice)}
          </div>
        </div>

        {/* Current Value */}
        <div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
            Value
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {formatCurrency(position.currentValue)}
          </div>
        </div>
      </div>

      {/* P&L Display */}
      <div
        style={{
          padding: '8px',
          background: position.cashPnl >= 0 ? '#f1f2e6' : '#f6ecec',
          borderRadius: '6px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            Profit/Loss
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: pnlColor }}>
              {formatCurrency(position.cashPnl)}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: pnlColor }}>
              ({formatPercent(position.percentPnl)})
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onCreateOrder(position)}
          data-cy="position-create-order"
          style={{
            flex: '1 1 calc(50% - 3px)',
            minWidth: '120px',
            padding: '8px 12px',
            background: '#1f2a33',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2a3641')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1f2a33')}
        >
          📊 Create Order
        </button>

        <button
          onClick={() => onQuickSell(position)}
          data-cy="position-quick-sell"
          style={{
            flex: '1 1 calc(50% - 3px)',
            minWidth: '120px',
            padding: '8px 12px',
            background: '#b24b4b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#9e3f3f')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#b24b4b')}
        >
          🚀 Quick Sell
        </button>

        <button
          onClick={() => onViewMarket(position)}
          data-cy="position-view-market"
          style={{
            flex: '1 1 calc(50% - 3px)',
            minWidth: '120px',
            padding: '8px 12px',
            background: '#6b7280',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4b5563')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#6b7280')}
        >
          🔗 View Market
        </button>

        {position.redeemable && (
          <button
            onClick={() => onRedeem(position)}
            data-cy="position-redeem"
          style={{
            flex: '1 1 calc(50% - 3px)',
            minWidth: '120px',
            padding: '8px 12px',
            background: '#7b8f5a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#6b7a4c')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#7b8f5a')}
        >
            💰 Redeem
          </button>
        )}
      </div>
    </div>
  );
}
