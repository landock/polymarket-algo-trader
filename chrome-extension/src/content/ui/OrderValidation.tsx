/**
 * Order Validation Utilities
 *
 * Validates algo order parameters before creation
 */

import React from 'react';
import type { AlgoOrderFormData } from './AlgoOrderForm';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Constants for validation
const MIN_ORDER_SIZE = 0.01;
const MAX_ORDER_SIZE = 100000;
const MIN_PRICE = 0.01;
const MAX_PRICE = 0.99;
const MIN_TRAIL_PERCENT = 0.1;
const MAX_TRAIL_PERCENT = 50;
const MIN_TWAP_DURATION = 1; // minutes
const MAX_TWAP_DURATION = 1440; // 24 hours
const MIN_TWAP_INTERVAL = 0.1; // minutes (6 seconds)

/**
 * Validate algo order form data
 */
export function validateAlgoOrder(orderData: AlgoOrderFormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate token ID
  if (!orderData.tokenId || orderData.tokenId.trim().length === 0) {
    errors.push('Token ID is required');
  } else if (orderData.tokenId.length < 10) {
    warnings.push('Token ID seems unusually short. Make sure it\'s correct.');
  }

  // Validate size
  if (orderData.size < MIN_ORDER_SIZE) {
    errors.push(`Order size must be at least ${MIN_ORDER_SIZE}`);
  }
  if (orderData.size > MAX_ORDER_SIZE) {
    errors.push(`Order size cannot exceed ${MAX_ORDER_SIZE}`);
  }
  if (orderData.size > 1000) {
    warnings.push('Large order size. Consider using TWAP to reduce market impact.');
  }

  // Type-specific validation
  switch (orderData.type) {
    case 'TRAILING_STOP':
      validateTrailingStop(orderData, errors, warnings);
      break;

    case 'STOP_LOSS':
    case 'TAKE_PROFIT':
      validateStopLoss(orderData, errors, warnings);
      break;

    case 'TWAP':
      validateTWAP(orderData, errors, warnings);
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate trailing stop parameters
 */
function validateTrailingStop(
  orderData: AlgoOrderFormData,
  errors: string[],
  warnings: string[]
) {
  if (!orderData.trailPercent) {
    errors.push('Trail percentage is required');
    return;
  }

  if (orderData.trailPercent < MIN_TRAIL_PERCENT) {
    errors.push(`Trail percentage must be at least ${MIN_TRAIL_PERCENT}%`);
  }

  if (orderData.trailPercent > MAX_TRAIL_PERCENT) {
    errors.push(`Trail percentage cannot exceed ${MAX_TRAIL_PERCENT}%`);
  }

  if (orderData.trailPercent < 1) {
    warnings.push('Very tight trailing stop (<1%). May trigger frequently.');
  }

  if (orderData.trailPercent > 20) {
    warnings.push('Wide trailing stop (>20%). Requires significant price movement.');
  }

  // Validate trigger price if provided
  if (orderData.triggerPrice !== undefined) {
    if (orderData.triggerPrice < MIN_PRICE || orderData.triggerPrice > MAX_PRICE) {
      errors.push(`Trigger price must be between ${MIN_PRICE} and ${MAX_PRICE}`);
    }
  }
}

/**
 * Validate stop-loss/take-profit parameters
 */
function validateStopLoss(
  orderData: AlgoOrderFormData,
  errors: string[],
  warnings: string[]
) {
  const hasStopLoss = orderData.stopLossPrice !== undefined && orderData.stopLossPrice > 0;
  const hasTakeProfit = orderData.takeProfitPrice !== undefined && orderData.takeProfitPrice > 0;

  if (!hasStopLoss && !hasTakeProfit) {
    errors.push('At least one of Stop-Loss or Take-Profit price is required');
    return;
  }

  // Validate stop-loss price
  if (hasStopLoss) {
    if (orderData.stopLossPrice! < MIN_PRICE || orderData.stopLossPrice! > MAX_PRICE) {
      errors.push(`Stop-loss price must be between ${MIN_PRICE} and ${MAX_PRICE}`);
    }
  }

  // Validate take-profit price
  if (hasTakeProfit) {
    if (orderData.takeProfitPrice! < MIN_PRICE || orderData.takeProfitPrice! > MAX_PRICE) {
      errors.push(`Take-profit price must be between ${MIN_PRICE} and ${MAX_PRICE}`);
    }
  }

  // Validate logical relationship for BUY orders
  if (orderData.side === 'BUY' && hasStopLoss && hasTakeProfit) {
    if (orderData.stopLossPrice! >= orderData.takeProfitPrice!) {
      errors.push('For BUY orders: Stop-loss must be below take-profit');
    }
  }

  // Validate logical relationship for SELL orders
  if (orderData.side === 'SELL' && hasStopLoss && hasTakeProfit) {
    if (orderData.stopLossPrice! <= orderData.takeProfitPrice!) {
      errors.push('For SELL orders: Stop-loss must be above take-profit');
    }
  }
}

/**
 * Validate TWAP parameters
 */
function validateTWAP(
  orderData: AlgoOrderFormData,
  errors: string[],
  warnings: string[]
) {
  if (!orderData.durationMinutes) {
    errors.push('Duration is required');
    return;
  }

  if (!orderData.intervalMinutes) {
    errors.push('Interval is required');
    return;
  }

  if (orderData.durationMinutes < MIN_TWAP_DURATION) {
    errors.push(`Duration must be at least ${MIN_TWAP_DURATION} minute`);
  }

  if (orderData.durationMinutes > MAX_TWAP_DURATION) {
    errors.push(`Duration cannot exceed ${MAX_TWAP_DURATION} minutes (24 hours)`);
  }

  if (orderData.intervalMinutes < MIN_TWAP_INTERVAL) {
    errors.push(`Interval must be at least ${MIN_TWAP_INTERVAL} minutes`);
  }

  if (orderData.intervalMinutes > orderData.durationMinutes) {
    errors.push('Interval cannot be longer than total duration');
  }

  // Calculate number of slices
  const numSlices = Math.ceil(orderData.durationMinutes / orderData.intervalMinutes);
  const sliceSize = orderData.size / numSlices;

  if (numSlices > 100) {
    warnings.push(`This will create ${numSlices} order slices. Consider increasing interval.`);
  }

  if (sliceSize < MIN_ORDER_SIZE) {
    errors.push(
      `Slice size (${sliceSize.toFixed(4)}) too small. ` +
      `Reduce duration, increase interval, or increase total size.`
    );
  }

  if (orderData.intervalMinutes < 0.5) {
    warnings.push('Very frequent execution (<30s). May cause issues with rate limits.');
  }
}

/**
 * Format validation messages for display
 */
export function formatValidationMessages(result: ValidationResult): React.ReactElement | null {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '16px' }} data-cy="order-validation">
      {result.errors.length > 0 && (
        <div style={{
          padding: '12px',
          background: '#f6ecec',
          border: '1px solid #e5c6c6',
          borderRadius: '6px',
          marginBottom: result.warnings.length > 0 ? '8px' : '0'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#8b3a3a', marginBottom: '8px' }}>
            ❌ Errors:
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#8b3a3a' }}>
            {result.errors.map((error, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div style={{
          padding: '12px',
          background: '#f6f0e6',
          border: '1px solid #d7c7ab',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#7a5a3a', marginBottom: '8px' }}>
            ⚠️ Warnings:
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#7a5a3a' }}>
            {result.warnings.map((warning, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
