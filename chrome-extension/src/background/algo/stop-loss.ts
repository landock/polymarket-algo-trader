/**
 * Stop-Loss / Take-Profit Algorithm
 *
 * Executes orders when price reaches predefined levels
 */

import type { MarketPrice } from '../market-monitor';

export interface StopLossParams {
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

/**
 * Evaluate stop-loss and take-profit conditions
 * Returns true if order should execute
 */
export function evaluateStopLoss(
  order: any,
  currentPrice: MarketPrice
): { shouldExecute: boolean; reason?: string } {
  const params = order.params as StopLossParams;
  const price = currentPrice.price;

  // Check stop-loss condition
  if (params.stopLossPrice !== undefined) {
    const triggered = order.side === 'BUY'
      ? price <= params.stopLossPrice
      : price >= params.stopLossPrice;

    if (triggered) {
      console.log(`Stop-loss triggered for order ${order.id}: price ${price} vs stop ${params.stopLossPrice}`);
      return {
        shouldExecute: true,
        reason: `Stop-loss at ${params.stopLossPrice}`
      };
    }
  }

  // Check take-profit condition
  if (params.takeProfitPrice !== undefined) {
    const triggered = order.side === 'BUY'
      ? price >= params.takeProfitPrice
      : price <= params.takeProfitPrice;

    if (triggered) {
      console.log(`Take-profit triggered for order ${order.id}: price ${price} vs target ${params.takeProfitPrice}`);
      return {
        shouldExecute: true,
        reason: `Take-profit at ${params.takeProfitPrice}`
      };
    }
  }

  return { shouldExecute: false };
}
