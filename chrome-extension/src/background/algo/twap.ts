/**
 * TWAP (Time-Weighted Average Price) Algorithm
 *
 * Splits a large order into smaller slices executed at regular intervals
 */

import type { MarketPrice } from '../market-monitor';

export interface TWAPParams {
  totalSize: number;
  durationMinutes: number;
  intervalMinutes: number;
  startTime: number;
}

/**
 * Evaluate TWAP execution
 * Returns the size to execute now (0 if not time yet)
 */
export function evaluateTWAP(
  order: any,
  currentPrice: MarketPrice
): { shouldExecute: boolean; executeSize?: number; isComplete?: boolean } {
  const params = order.params as TWAPParams;
  const now = Date.now();

  // Calculate elapsed time
  const elapsedMinutes = (now - params.startTime) / (1000 * 60);

  // Check if duration exceeded
  if (elapsedMinutes > params.durationMinutes) {
    const remainingSize = params.totalSize - (order.executedSize || 0);

    if (remainingSize > 0.01) {
      // Execute remaining size
      console.log(`TWAP duration exceeded for order ${order.id}, executing remaining ${remainingSize}`);
      return {
        shouldExecute: true,
        executeSize: remainingSize,
        isComplete: true
      };
    }

    // Already fully executed
    return {
      shouldExecute: false,
      isComplete: true
    };
  }

  // Calculate expected number of executions so far
  const expectedExecutions = Math.floor(elapsedMinutes / params.intervalMinutes);
  const actualExecutions = order.executionHistory?.length || 0;

  // Check if we need to execute a new slice
  if (actualExecutions < expectedExecutions) {
    // Calculate slice size
    const totalSlices = Math.ceil(params.durationMinutes / params.intervalMinutes);
    const sliceSize = params.totalSize / totalSlices;
    const remainingSize = params.totalSize - (order.executedSize || 0);
    const executeSize = Math.min(sliceSize, remainingSize);

    if (executeSize >= 0.01) {
      // Minimum order size check
      console.log(`TWAP executing slice ${actualExecutions + 1} of order ${order.id}: ${executeSize} shares`);
      return {
        shouldExecute: true,
        executeSize,
        isComplete: false
      };
    }
  }

  return { shouldExecute: false };
}
