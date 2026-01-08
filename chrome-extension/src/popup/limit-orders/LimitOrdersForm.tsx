import React from 'react';
import type { OrderSide } from '../../shared/types';

interface LimitOrdersFormProps {
  tokenId: string;
  marketQuestion: string;
  outcome: string;
  side: OrderSide;
  size: string;
  limitPrice: string;
  onTokenIdChange: (value: string) => void;
  onMarketQuestionChange: (value: string) => void;
  onOutcomeChange: (value: string) => void;
  onSideChange: (value: OrderSide) => void;
  onSizeChange: (value: string) => void;
  onLimitPriceChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export default function LimitOrdersForm({
  tokenId,
  marketQuestion,
  outcome,
  side,
  size,
  limitPrice,
  onTokenIdChange,
  onMarketQuestionChange,
  onOutcomeChange,
  onSideChange,
  onSizeChange,
  onLimitPriceChange,
  onSubmit
}: LimitOrdersFormProps) {
  return (
    <div style={{
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Create New Limit Order</h2>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Token ID *
            </label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => onTokenIdChange(e.target.value)}
              placeholder="0x..."
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Side *
            </label>
            <select
              value={side}
              onChange={(e) => onSideChange(e.target.value as OrderSide)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Size (contracts) *
            </label>
            <input
              type="number"
              value={size}
              onChange={(e) => onSizeChange(e.target.value)}
              placeholder="10"
              step="0.01"
              min="0.01"
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Limit Price *
            </label>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => onLimitPriceChange(e.target.value)}
              placeholder="0.50"
              step="0.0001"
              min="0.0001"
              max="0.9999"
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Market Question (optional)
            </label>
            <input
              type="text"
              value={marketQuestion}
              onChange={(e) => onMarketQuestionChange(e.target.value)}
              placeholder="Will X happen?"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Outcome (optional)
            </label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => onOutcomeChange(e.target.value)}
              placeholder="Yes / No"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 24px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          Create Limit Order
        </button>
      </form>
    </div>
  );
}
