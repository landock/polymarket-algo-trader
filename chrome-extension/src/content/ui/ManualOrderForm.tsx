/**
 * Manual Order Form
 *
 * Create market or limit orders directly from the widget.
 */

import React, { useEffect, useState } from 'react';
import { Side } from '@polymarket/clob-client';
import type { CreateLimitOrderRequest, CreateMarketOrderRequest } from '../../shared/types';
import type { MarketContext } from '../hooks/useMarketContext';
import usePolygonBalances from '../../shared/hooks/usePolygonBalances';
import { useTrading } from '../../shared/providers/TradingProvider';

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
  const { eoaAddress, clobClient } = useTrading();
  const { formattedUsdcBalance, isLoading: isBalanceLoading } =
    usePolygonBalances(eoaAddress ?? null);
  const [orderType, setOrderType] = useState<ManualOrderType>('MARKET');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [size, setSize] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState(0);
  const [outcomePrices, setOutcomePrices] = useState<Record<string, number>>({});

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

  useEffect(() => {
    let isMounted = true;

    if (!clobClient || options.length === 0) {
      setOutcomePrices({});
      return () => {
        isMounted = false;
      };
    }

    const loadPrices = async () => {
      const entries = await Promise.all(
        options.map(async (option) => {
          try {
            const response = await clobClient.getPrice(option.tokenId, Side.BUY);
            const price = parseFloat(response.price);
            if (Number.isFinite(price) && price > 0 && price < 1) {
              return [option.tokenId, price] as const;
            }
          } catch {
            return null;
          }
          return null;
        })
      );

      if (!isMounted) {
        return;
      }

      const next: Record<string, number> = {};
      for (const entry of entries) {
        if (entry) {
          next[entry[0]] = entry[1];
        }
      }
      setOutcomePrices(next);
    };

    loadPrices();

    return () => {
      isMounted = false;
    };
  }, [clobClient, options]);

  const formatPriceCents = (price?: number) => {
    if (!price) {
      return null;
    }
    return `${Math.round(price * 100)}¢`;
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            type="button"
            onClick={() => setSide('BUY')}
            data-cy="manual-side-buy-tab"
            style={{
              padding: '0 0 6px',
              border: 'none',
              borderBottom: side === 'BUY' ? '2px solid #1f2a33' : '2px solid transparent',
              background: 'transparent',
              fontSize: '16px',
              fontWeight: 700,
              color: side === 'BUY' ? '#1f2a33' : '#9ca3af',
              cursor: 'pointer'
            }}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            data-cy="manual-side-sell-tab"
            style={{
              padding: '0 0 6px',
              border: 'none',
              borderBottom: side === 'SELL' ? '2px solid #1f2a33' : '2px solid transparent',
              background: 'transparent',
              fontSize: '16px',
              fontWeight: 700,
              color: side === 'SELL' ? '#1f2a33' : '#9ca3af',
              cursor: 'pointer'
            }}
          >
            Sell
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>
            Order
          </label>
          <select
            value={orderType}
            onChange={(event) => setOrderType(event.target.value as ManualOrderType)}
            data-cy="manual-order-type"
            disabled={isSubmitting}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #e2dbd1',
              background: '#fbf9f6',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1f2a33'
            }}
          >
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {options.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#1f2a33' }}>
              Outcome
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {options.map((option, index) => (
                <button
                  key={option.tokenId}
                  type="button"
                  onClick={() => setSelectedOutcomeIndex(index)}
                  data-cy={`manual-outcome-${index}`}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: selectedOutcomeIndex === index ? '#1f2a33' : '#f3f4f6',
                    color: selectedOutcomeIndex === index ? '#fbf9f6' : '#9ca3af',
                    border: selectedOutcomeIndex === index ? '1px solid #1f2a33' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span>{option.outcome || `Option ${index + 1}`}</span>
                    {formatPriceCents(outcomePrices[option.tokenId]) && (
                      <span>{formatPriceCents(outcomePrices[option.tokenId])}</span>
                    )}
                  </div>
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

        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1f2a33' }}>
                Amount
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Balance {isBalanceLoading ? '--' : `$${formattedUsdcBalance}`}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              Shares
            </div>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="0.00"
            data-cy="manual-size"
            disabled={isSubmitting}
            style={{ width: '100%', fontSize: '16px', fontWeight: 600 }}
          />
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
