/**
 * Manual Order Form
 *
 * Create market or limit orders directly from the widget.
 */

import React, { useEffect, useState } from 'react';
import type { CreateLimitOrderRequest, CreateMarketOrderRequest } from '../../shared/types';
import type { MarketContext } from '../hooks/useMarketContext';

interface ManualOrderFormProps {
  onExecuteMarket: (order: CreateMarketOrderRequest) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  onCreateLimit: (order: CreateLimitOrderRequest) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  marketContext?: MarketContext;
}

type ManualOrderType = 'MARKET' | 'LIMIT';

export default function ManualOrderForm({
  onExecuteMarket,
  onCreateLimit,
  marketContext,
}: ManualOrderFormProps) {
  const [orderType, setOrderType] = useState<ManualOrderType>('MARKET');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [size, setSize] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState(0);

  const options = marketContext?.options ?? [];
  const selectedOption = options[selectedOutcomeIndex];
  const tokenId = selectedOption?.tokenId;

  const resetForm = () => {
    setSize('');
    setLimitPrice('');
  };

  useEffect(() => {
    setSelectedOutcomeIndex(0);
  }, [options.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedSize = parseFloat(size);
    if (!tokenId) {
      setError('Open a market page to place manual orders.');
      return;
    }
    if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
      setError('Size must be greater than 0.');
      return;
    }

    if (orderType === 'LIMIT') {
      const parsedPrice = parseFloat(limitPrice);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        setError('Limit price must be greater than 0.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (orderType === 'MARKET') {
        const result = await onExecuteMarket({
          tokenId,
          side,
          size: parsedSize
        });
        if (!result.success) {
          throw new Error(result.error || 'Failed to execute market order');
        }
        resetForm();
      } else {
        const result = await onCreateLimit({
          tokenId,
          side,
          size: parsedSize,
          limitPrice: parseFloat(limitPrice)
        });
        if (!result.success) {
          throw new Error(result.error || 'Failed to create limit order');
        }
        resetForm();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="manual-order-form" data-cy="manual-order-form">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setOrderType('MARKET')}
          data-cy="manual-order-market-tab"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            background: orderType === 'MARKET' ? '#1f2a33' : '#f6f0e6',
            color: orderType === 'MARKET' ? '#fbf9f6' : '#7a5a3a',
            border: orderType === 'MARKET' ? '1px solid #1f2a33' : '1px solid #d7c7ab',
            cursor: 'pointer'
          }}
        >
          Market
        </button>
        <button
          type="button"
          onClick={() => setOrderType('LIMIT')}
          data-cy="manual-order-limit-tab"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            background: orderType === 'LIMIT' ? '#1f2a33' : '#f6f0e6',
            color: orderType === 'LIMIT' ? '#fbf9f6' : '#7a5a3a',
            border: orderType === 'LIMIT' ? '1px solid #1f2a33' : '1px solid #d7c7ab',
            cursor: 'pointer'
          }}
        >
          Limit
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {options.length > 1 && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#1f2a33' }}>
              Outcome
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {options.map((option, index) => (
                <button
                  key={option.tokenId}
                  type="button"
                  onClick={() => setSelectedOutcomeIndex(index)}
                  data-cy={`manual-outcome-${index}`}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: selectedOutcomeIndex === index ? '#1f2a33' : '#f6f0e6',
                    color: selectedOutcomeIndex === index ? '#fbf9f6' : '#7a5a3a',
                    border: selectedOutcomeIndex === index ? '1px solid #1f2a33' : '1px solid #d7c7ab',
                    cursor: 'pointer'
                  }}
                >
                  {option.outcome || `Option ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {options.length === 0 && (
          <div
            data-cy="manual-order-context-missing"
            style={{
              padding: '8px 10px',
              background: '#f6f0e6',
              border: '1px solid #d7c7ab',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#7a5a3a',
              marginBottom: '10px'
            }}
          >
            Open a market page to place manual orders.
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#1f2a33' }}>
              Side
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSide('BUY')}
                data-cy="manual-side-buy"
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: side === 'BUY' ? '#7b8f5a' : 'transparent',
                  color: side === 'BUY' ? '#ffffff' : '#7b8f5a',
                  border: `1px solid #7b8f5a`,
                  cursor: 'pointer'
                }}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                data-cy="manual-side-sell"
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: side === 'SELL' ? '#b24b4b' : 'transparent',
                  color: side === 'SELL' ? '#ffffff' : '#b24b4b',
                  border: `1px solid #b24b4b`,
                  cursor: 'pointer'
                }}
              >
                SELL
              </button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#1f2a33' }}>
              Size
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              data-cy="manual-size"
              disabled={isSubmitting}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {orderType === 'LIMIT' && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#1f2a33' }}>
              Limit Price
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="0.0000"
              data-cy="manual-limit-price"
              disabled={isSubmitting}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {error && (
          <div
            data-cy="manual-order-error"
            style={{
              padding: '8px 10px',
              background: '#f6ecec',
              border: '1px solid #e5c6c6',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#8b3a3a',
              marginBottom: '10px'
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          data-cy="manual-submit"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '10px',
            background: '#1f2a33',
            color: '#fbf9f6',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            fontSize: '11px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1
          }}
        >
          {isSubmitting ? 'Submitting...' : orderType === 'MARKET' ? 'Place Market Order' : 'Place Limit Order'}
        </button>
      </form>
    </div>
  );
}
