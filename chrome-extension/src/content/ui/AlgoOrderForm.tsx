/**
 * Algorithmic Order Creation Form
 *
 * Allows users to create different types of algorithmic orders:
 * - Trailing Stop
 * - Stop-Loss / Take-Profit
 * - TWAP (Time-Weighted Average Price)
 */

import React, { useState, useEffect } from 'react';
import type { AlgoOrderType } from '../../shared/types';
import { validateAlgoOrder, formatValidationMessages, type ValidationResult } from './OrderValidation';
import OrderPreview from './OrderPreview';

interface AlgoOrderFormProps {
  onSubmit: (order: AlgoOrderFormData) => void;
  onCancel: () => void;
  initialData?: Partial<AlgoOrderFormData>;
}

export interface AlgoOrderFormData {
  type: AlgoOrderType;
  tokenId: string;
  side: 'BUY' | 'SELL';
  size: number;

  // Trailing Stop params
  trailPercent?: number;
  triggerPrice?: number;

  // Stop-Loss / Take-Profit params
  stopLossPrice?: number;
  takeProfitPrice?: number;

  // TWAP params
  durationMinutes?: number;
  intervalMinutes?: number;
}

export default function AlgoOrderForm({ onSubmit, onCancel, initialData }: AlgoOrderFormProps) {
  const [orderType, setOrderType] = useState<AlgoOrderType>(initialData?.type || 'TRAILING_STOP');
  const [tokenId, setTokenId] = useState(initialData?.tokenId || '');
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialData?.side || 'BUY');
  const [size, setSize] = useState(initialData?.size?.toString() || '');

  // Trailing Stop fields
  const [trailPercent, setTrailPercent] = useState('5');
  const [triggerPrice, setTriggerPrice] = useState('');

  // Stop-Loss / Take-Profit fields
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');

  // TWAP fields
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [intervalMinutes, setIntervalMinutes] = useState('5');

  // Validation state
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: false,
    errors: [],
    warnings: []
  });
  const [showValidation, setShowValidation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<AlgoOrderFormData | null>(null);

  // Build order data from form state
  const buildOrderData = (): AlgoOrderFormData => {
    const baseOrder = {
      type: orderType,
      tokenId,
      side,
      size: parseFloat(size) || 0,
    };

    switch (orderType) {
      case 'TRAILING_STOP':
        return {
          ...baseOrder,
          trailPercent: parseFloat(trailPercent) || 0,
          triggerPrice: triggerPrice ? parseFloat(triggerPrice) : undefined,
        };

      case 'STOP_LOSS':
      case 'TAKE_PROFIT':
        return {
          ...baseOrder,
          stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
          takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
        };

      case 'TWAP':
        return {
          ...baseOrder,
          durationMinutes: parseFloat(durationMinutes) || 0,
          intervalMinutes: parseFloat(intervalMinutes) || 0,
        };

      default:
        return baseOrder;
    }
  };

  // Validate form in real-time
  useEffect(() => {
    const orderData = buildOrderData();
    const result = validateAlgoOrder(orderData);
    setValidation(result);
  }, [orderType, tokenId, side, size, trailPercent, triggerPrice, stopLossPrice, takeProfitPrice, durationMinutes, intervalMinutes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    const orderData = buildOrderData();
    const result = validateAlgoOrder(orderData);

    if (!result.isValid) {
      // Validation failed - errors will be shown
      return;
    }

    // Show preview before submitting
    setPendingOrder(orderData);
    setShowPreview(true);
  };

  const handleConfirmOrder = () => {
    if (pendingOrder) {
      onSubmit(pendingOrder);
      setShowPreview(false);
      setPendingOrder(null);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPendingOrder(null);
  };

  return (
    <div className="algo-order-form" data-cy="algo-order-form">
      <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Create Algo Order</h4>

      <form onSubmit={handleSubmit}>
        {/* Order Type Selection */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
            Order Type
          </label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as AlgoOrderType)}
            data-cy="order-type"
            style={{ width: '100%' }}
          >
            <option value="TRAILING_STOP">Trailing Stop</option>
            <option value="STOP_LOSS">Stop-Loss / Take-Profit</option>
            <option value="TWAP">TWAP</option>
          </select>
        </div>

        {/* Market Token ID */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
            Market Token ID
          </label>
          <input
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="Enter token ID"
            required
            data-cy="token-id"
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
            Token ID from the market you want to trade
          </p>
        </div>

        {/* Side (BUY/SELL) */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
            Side
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSide('BUY')}
              data-cy="side-buy"
              style={{
                flex: 1,
                background: side === 'BUY' ? '#7b8f5a' : 'transparent',
                color: side === 'BUY' ? 'white' : '#7b8f5a',
                border: `1px solid #7b8f5a`,
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              data-cy="side-sell"
              style={{
                flex: 1,
                background: side === 'SELL' ? '#b24b4b' : 'transparent',
                color: side === 'SELL' ? 'white' : '#b24b4b',
                border: `1px solid #b24b4b`,
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              SELL
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            BUY = Purchase shares | SELL = Sell shares (outcome determined by Token ID)
          </div>
        </div>

        {/* Size */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
            Size (shares)
          </label>
          <input
            type="number"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="100"
            min="0.01"
            step="0.01"
            required
            data-cy="order-size"
            style={{ width: '100%' }}
          />
        </div>

        {/* Conditional Fields Based on Order Type */}
        {orderType === 'TRAILING_STOP' && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                Trail Percentage
              </label>
              <input
                type="number"
                value={trailPercent}
                onChange={(e) => setTrailPercent(e.target.value)}
                placeholder="5"
                min="0.1"
                step="0.1"
                required
                data-cy="trail-percent"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
                Order triggers when price moves {trailPercent}% from the peak/bottom
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                Trigger Price (optional)
              </label>
              <input
                type="number"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                placeholder="0.50"
                min="0.01"
                max="0.99"
                step="0.01"
                data-cy="trigger-price"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
                Only activate trailing stop after reaching this price
              </p>
            </div>
          </>
        )}

        {(orderType === 'STOP_LOSS' || orderType === 'TAKE_PROFIT') && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                Stop-Loss Price (optional)
              </label>
              <input
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="0.30"
                min="0.01"
                max="0.99"
                step="0.01"
                data-cy="stop-loss-price"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
                Exit position if price reaches this level
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                Take-Profit Price (optional)
              </label>
              <input
                type="number"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                placeholder="0.80"
                min="0.01"
                max="0.99"
                step="0.01"
                data-cy="take-profit-price"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
                Take profit when price reaches this level
              </p>
            </div>
          </>
        )}

        {orderType === 'TWAP' && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                Duration (minutes)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="60"
                min="1"
                step="1"
                required
                data-cy="twap-duration"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
                Total time to execute the order over
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                Interval (minutes)
              </label>
              <input
                type="number"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(e.target.value)}
                placeholder="5"
                min="1"
                step="1"
                required
                data-cy="twap-interval"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
                Time between each order slice
              </p>
            </div>
          </>
        )}

        {/* Validation Messages */}
        {showValidation && formatValidationMessages(validation)}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onCancel}
            data-cy="order-cancel"
            style={{
              flex: 1,
              background: 'transparent',
              color: '#666',
              border: '1px solid #ddd'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={showValidation && !validation.isValid}
            data-cy="order-submit"
            style={{
              flex: 1,
              opacity: showValidation && !validation.isValid ? 0.5 : 1,
              cursor: showValidation && !validation.isValid ? 'not-allowed' : 'pointer'
            }}
          >
            Create Order
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#fff9f2',
        border: '1px solid #e2dbd1',
        borderRadius: '10px',
        fontSize: '11px',
        color: '#8a6a50'
      }}>
        <strong>ℹ️ Note:</strong> Algo orders are monitored by the service worker
        and execute automatically when conditions are met.
      </div>

      {/* Order Preview Modal */}
      {showPreview && pendingOrder && (
        <OrderPreview
          order={pendingOrder}
          onConfirm={handleConfirmOrder}
          onCancel={handleCancelPreview}
        />
      )}
    </div>
  );
}
