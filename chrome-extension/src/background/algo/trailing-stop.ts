/**
 * Trailing Stop Algorithm
 *
 * Follows price movements and triggers when price retraces by a set percentage
 * - BUY orders: Trail up from the lowest price
 * - SELL orders: Trail down from the highest price
 */

import type { MarketPrice } from '../market-monitor';

export interface TrailingStopParams {
  trailPercent: number;
  triggerPrice?: number;
}

export interface TrailingStopState {
  highestPrice?: number;
  lowestPrice?: number;
  isActivated: boolean;
}

/**
 * Evaluate trailing stop condition
 * Returns true if order should execute
 */
export function evaluateTrailingStop(
  order: any,
  currentPrice: MarketPrice,
  state: TrailingStopState
): { shouldExecute: boolean; updatedState: TrailingStopState } {
  const params = order.params as TrailingStopParams;
  const price = currentPrice.price;

  // If trigger price is set and not yet reached, don't activate
  if (params.triggerPrice && !state.isActivated) {
    const triggered = order.side === 'BUY'
      ? price <= params.triggerPrice
      : price >= params.triggerPrice;

    if (!triggered) {
      return { shouldExecute: false, updatedState: state };
    }

    // Activation triggered
    state.isActivated = true;
    console.log(`Trailing stop activated for order ${order.id} at price ${price}`);
  }

  // For BUY orders: Trail up from the lowest price
  if (order.side === 'BUY') {
    const lowestPrice = state.lowestPrice ?? price;
    const newLowest = Math.min(lowestPrice, price);
    const stopPrice = newLowest * (1 + params.trailPercent / 100);

    // Check if price rose by trailPercent from lowest
    if (price >= stopPrice && lowestPrice < price) {
      console.log(`Trailing stop BUY triggered: price ${price} >= stop ${stopPrice.toFixed(4)}`);
      return {
        shouldExecute: true,
        updatedState: { ...state, lowestPrice: newLowest }
      };
    }

    // Update lowest price
    if (newLowest !== lowestPrice) {
      console.log(`Trailing stop BUY: new lowest ${newLowest.toFixed(4)} (stop at ${stopPrice.toFixed(4)})`);
    }

    return {
      shouldExecute: false,
      updatedState: { ...state, lowestPrice: newLowest }
    };
  }

  // For SELL orders: Trail down from the highest price
  else {
    const highestPrice = state.highestPrice ?? price;
    const newHighest = Math.max(highestPrice, price);
    const stopPrice = newHighest * (1 - params.trailPercent / 100);

    // Check if price fell by trailPercent from highest
    if (price <= stopPrice && highestPrice > price) {
      console.log(`Trailing stop SELL triggered: price ${price} <= stop ${stopPrice.toFixed(4)}`);
      return {
        shouldExecute: true,
        updatedState: { ...state, highestPrice: newHighest }
      };
    }

    // Update highest price
    if (newHighest !== highestPrice) {
      console.log(`Trailing stop SELL: new highest ${newHighest.toFixed(4)} (stop at ${stopPrice.toFixed(4)})`);
    }

    return {
      shouldExecute: false,
      updatedState: { ...state, highestPrice: newHighest }
    };
  }
}
