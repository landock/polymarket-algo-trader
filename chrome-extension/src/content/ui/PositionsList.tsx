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
  "data-cy"?: string;
}

export default function PositionsList({
  positions,
  isLoading,
  error,
  onCreateOrder,
  onQuickSell,
  onViewMarket,
  onRedeem,
  onRefresh,
  "data-cy": dataCy
}: PositionsListProps) {
  // Error State
  if (error && positions.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          background: '#f6ecec',
          border: '1px solid #e5c6c6',
          borderRadius: '8px',
        }}
        data-cy="positions-error"
      >
        <div style={{ fontSize: '13px', color: '#8b3a3a', marginBottom: '8px' }}>
          ⚠️ {error}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              padding: '6px 12px',
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
        data-cy="positions-loading"
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
          border: '2px dashed #e2dbd1',
          borderRadius: '8px',
          background: '#fff9f2',
        }}
        data-cy="positions-empty"
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>
          📊
        </div>
        <div style={{ fontSize: '13px', color: '#1f2a33', fontWeight: 600, marginBottom: '4px' }}>
          No Positions Found
        </div>
        <div style={{ fontSize: '12px', color: '#6b7a86' }}>
          Start trading to see your positions here
        </div>
      </div>
    );
  }

  // Positions List
  return (
    <div data-cy={dataCy}>
      {/* Loading indicator for background refresh */}
      {isLoading && positions.length > 0 && (
        <div
          style={{
            padding: '8px',
            background: '#fff9f2',
            border: '1px solid #e2dbd1',
            borderRadius: '10px',
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
              border: '2px solid #8a6a50',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ fontSize: '11px', color: '#8a6a50', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Refreshing...
          </div>
        </div>
      )}

      {/* Error indicator for background refresh */}
      {error && positions.length > 0 && (
        <div
          style={{
            padding: '8px',
            background: '#f6ecec',
            border: '1px solid #e5c6c6',
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '11px',
            color: '#8b3a3a',
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
                background: '#b24b4b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
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
