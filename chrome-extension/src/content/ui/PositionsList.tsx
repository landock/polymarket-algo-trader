/**
 * Positions List Component
 *
 * Displays list of user positions with empty/loading/error states
 */

import React from 'react';
import PositionCard from './PositionCard';
import LoadingSpinner from './LoadingSpinner';
import type { PolymarketPosition } from '../../shared/types/positions';

interface PositionsListProps {
  positions: PolymarketPosition[];
  isLoading: boolean;
  error: string | null;
  onCreateOrder: (position: PolymarketPosition) => void;
  onQuickSell: (position: PolymarketPosition) => void;
  onViewMarket: (position: PolymarketPosition) => void;
  onRedeem: (position: PolymarketPosition) => void;
  onRefresh?: () => void;
}

export default function PositionsList({
  positions,
  isLoading,
  error,
  onCreateOrder,
  onQuickSell,
  onViewMarket,
  onRedeem,
  onRefresh
}: PositionsListProps) {
  // Error State
  if (error && positions.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
        }}
      >
        <div style={{ fontSize: '13px', color: '#991b1b', marginBottom: '8px' }}>
          ⚠️ {error}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              padding: '6px 12px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Loading State (initial load only)
  if (isLoading && positions.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <LoadingSpinner />
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          Loading positions...
        </div>
      </div>
    );
  }

  // Empty State
  if (positions.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          border: '2px dashed #e5e7eb',
          borderRadius: '8px',
          background: '#f9fafb',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>
          📊
        </div>
        <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600, marginBottom: '4px' }}>
          No Positions Found
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          Start trading to see your positions here
        </div>
      </div>
    );
  }

  // Positions List
  return (
    <div>
      {/* Loading indicator for background refresh */}
      {isLoading && positions.length > 0 && (
        <div
          style={{
            padding: '8px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              border: '2px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ fontSize: '11px', color: '#1e40af' }}>
            Refreshing...
          </div>
        </div>
      )}

      {/* Error indicator for background refresh */}
      {error && positions.length > 0 && (
        <div
          style={{
            padding: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '8px',
            fontSize: '11px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠️ {error}</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                padding: '4px 8px',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Position Cards */}
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {positions.map((position) => (
          <PositionCard
            key={position.asset}
            position={position}
            onCreateOrder={onCreateOrder}
            onQuickSell={onQuickSell}
            onViewMarket={onViewMarket}
            onRedeem={onRedeem}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
