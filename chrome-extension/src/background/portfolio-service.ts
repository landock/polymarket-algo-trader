/**
 * Portfolio Service
 *
 * Calculates aggregate portfolio metrics from positions and order history
 */

import type { PolymarketPosition } from '../shared/types/positions';
import type { PortfolioMetrics, PositionBreakdown, OrderHistoryEntry } from '../shared/types';
import { getOrderHistory } from '../storage/order-history';

/**
 * Calculate portfolio metrics from positions
 */
export function calculatePortfolioMetrics(
  positions: PolymarketPosition[],
  orderHistory?: OrderHistoryEntry[]
): PortfolioMetrics {
  // Calculate total portfolio value (sum of all position current values)
  const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);

  // Calculate unrealized P&L (sum of all position P&L)
  const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.cashPnl, 0);

  // Calculate realized P&L from order history if available
  let realizedPnL = 0;
  let totalVolume = 0;

  if (orderHistory) {
    // Calculate realized P&L from completed trades
    // For BUY orders: negative (money spent)
    // For SELL orders: positive (money received)
    // Net P&L = sells - buys
    const executedOrders = orderHistory.filter(
      order => order.status === 'EXECUTED' || order.status === 'PENDING'
    );

    totalVolume = executedOrders.reduce((sum, order) => {
      const orderValue = order.size * (order.executedPrice || order.price);
      return sum + orderValue;
    }, 0);

    // Group by token to calculate realized P&L per position
    const tokenOrdersMap = new Map<string, OrderHistoryEntry[]>();
    executedOrders.forEach(order => {
      const existing = tokenOrdersMap.get(order.tokenId) || [];
      existing.push(order);
      tokenOrdersMap.set(order.tokenId, existing);
    });

    // Calculate realized P&L using FIFO matching
    tokenOrdersMap.forEach((orders, tokenId) => {
      const buys: OrderHistoryEntry[] = orders.filter(o => o.side === 'BUY');
      const sells: OrderHistoryEntry[] = orders.filter(o => o.side === 'SELL');

      // Simple approach: sum all sells - sum all buys
      const totalBuyValue = buys.reduce((sum, order) => {
        return sum + (order.size * (order.executedPrice || order.price));
      }, 0);

      const totalSellValue = sells.reduce((sum, order) => {
        return sum + (order.size * (order.executedPrice || order.price));
      }, 0);

      // Realized P&L for this token
      const tokenRealizedPnL = totalSellValue - totalBuyValue;
      realizedPnL += tokenRealizedPnL;
    });
  }

  // Total P&L
  const totalPnL = realizedPnL + unrealizedPnL;

  // Calculate total P&L percentage
  // Base it on total invested capital (realized + unrealized initial values)
  const totalInitialValue = positions.reduce((sum, pos) => sum + pos.initialValue, 0);
  const totalInvested = totalInitialValue || 1; // Avoid division by zero
  const totalPnLPercent = (totalPnL / totalInvested) * 100;

  return {
    totalValue,
    realizedPnL,
    unrealizedPnL,
    totalPnL,
    totalPnLPercent,
    positionCount: positions.length,
    totalVolume,
    lastUpdated: Date.now()
  };
}

/**
 * Calculate position breakdown with portfolio percentages
 */
export function calculatePositionBreakdown(
  positions: PolymarketPosition[]
): PositionBreakdown[] {
  const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);

  return positions.map(pos => ({
    tokenId: pos.asset,
    marketQuestion: pos.title,
    outcome: pos.outcome,
    size: pos.size,
    currentValue: pos.currentValue,
    percentOfPortfolio: totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0,
    unrealizedPnL: pos.cashPnl,
    unrealizedPnLPercent: pos.percentPnl
  }))
  // Sort by portfolio percentage (largest first)
  .sort((a, b) => b.percentOfPortfolio - a.percentOfPortfolio);
}

/**
 * Fetch and calculate complete portfolio metrics
 * This function is meant to be called from the background service worker
 */
export async function fetchPortfolioMetrics(
  positions: PolymarketPosition[]
): Promise<{
  metrics: PortfolioMetrics;
  breakdown: PositionBreakdown[];
}> {
  // Fetch order history for realized P&L calculation
  const orderHistory = await getOrderHistory();

  const metrics = calculatePortfolioMetrics(positions, orderHistory);
  const breakdown = calculatePositionBreakdown(positions);

  return {
    metrics,
    breakdown
  };
}
