/**
 * Algorithmic Order Execution Engine
 *
 * Evaluates all active algo orders and executes when conditions are met
 */

import { fetchTokenPrices, getActiveTokenIds } from './market-monitor';
import { evaluateTrailingStop } from './algo/trailing-stop';
import { evaluateStopLoss } from './algo/stop-loss';
import { evaluateTWAP } from './algo/twap';
import { executeMarketOrder, hasTradingSession, getOpenOrders } from './trading-session';
import { saveOrderToHistory, updateOrderHistoryEntry } from '../storage/order-history';
import type { OrderHistoryEntry, AlgoOrderType } from '../shared/types';
import { getPendingLimitOrders, updateLimitOrder, getActiveLimitOrderTokenIds } from '../storage/limit-orders';

/**
 * Main engine tick - called by alarm every few seconds
 */
export async function tickAlgoEngine() {
  try {
    // Get all active token IDs from algo orders
    const algoTokenIds = await getActiveTokenIds();

    // Get token IDs from pending limit orders
    const limitOrderTokenIds = await getActiveLimitOrderTokenIds();

    // Combine all unique token IDs
    const allTokenIds = Array.from(new Set([...algoTokenIds, ...limitOrderTokenIds]));

    if (allTokenIds.length === 0) {
      // No active orders to monitor
      return;
    }

    console.log(`[AlgoEngine] Monitoring ${allTokenIds.length} tokens (${algoTokenIds.length} algo, ${limitOrderTokenIds.length} limit)`);

    // Fetch current prices for all tokens
    const prices = await fetchTokenPrices(allTokenIds);

    console.log(`[AlgoEngine] Fetched prices for ${prices.size} tokens`);

    // Check limit orders first
    await checkLimitOrders(prices);

    // Load all algo orders
    const result = await chrome.storage.local.get('algo_orders');
    const orders = result.algo_orders || [];

    // Filter only ACTIVE orders (not PAUSED)
    const activeOrders = orders.filter((o: any) => o.status === 'ACTIVE');

    console.log(`[AlgoEngine] Evaluating ${activeOrders.length} active algo orders`);

    // Evaluate each order
    for (const order of activeOrders) {
      const price = prices.get(order.tokenId);

      if (!price) {
        console.warn(`[AlgoEngine] No price for token ${order.tokenId}, skipping order ${order.id}`);
        continue;
      }

      // Evaluate based on order type
      await evaluateOrder(order, price, orders);
    }

    // Save updated orders
    await chrome.storage.local.set({ algo_orders: orders });
  } catch (error) {
    console.error('[AlgoEngine] Error in tick:', error);
  }
}

/**
 * Evaluate a single order
 */
async function evaluateOrder(order: any, price: any, allOrders: any[]) {
  try {
    switch (order.type) {
      case 'TRAILING_STOP':
        await evaluateTrailingStopOrder(order, price, allOrders);
        break;

      case 'STOP_LOSS':
      case 'TAKE_PROFIT':
        await evaluateStopLossOrder(order, price, allOrders);
        break;

      case 'TWAP':
        await evaluateTWAPOrder(order, price, allOrders);
        break;

      default:
        console.warn(`[AlgoEngine] Unknown order type: ${order.type}`);
    }
  } catch (error) {
    console.error(`[AlgoEngine] Error evaluating order ${order.id}:`, error);
  }
}

/**
 * Evaluate trailing stop order
 */
async function evaluateTrailingStopOrder(order: any, price: any, allOrders: any[]) {
  const state = {
    highestPrice: order.highestPrice,
    lowestPrice: order.lowestPrice,
    isActivated: order.isActivated || false
  };

  const result = evaluateTrailingStop(order, price, state);

  // Update order state
  const orderIndex = allOrders.findIndex((o: any) => o.id === order.id);
  if (orderIndex !== -1) {
    allOrders[orderIndex].highestPrice = result.updatedState.highestPrice;
    allOrders[orderIndex].lowestPrice = result.updatedState.lowestPrice;
    allOrders[orderIndex].isActivated = result.updatedState.isActivated;
    allOrders[orderIndex].updatedAt = Date.now();
  }

  if (result.shouldExecute) {
    await executeOrder(order, price.price, allOrders);
  }
}

/**
 * Evaluate stop-loss/take-profit order
 */
async function evaluateStopLossOrder(order: any, price: any, allOrders: any[]) {
  const result = evaluateStopLoss(order, price);

  if (result.shouldExecute) {
    await executeOrder(order, price.price, allOrders, result.reason);
  }
}

/**
 * Evaluate TWAP order
 */
async function evaluateTWAPOrder(order: any, price: any, allOrders: any[]) {
  const result = evaluateTWAP(order, price);

  if (result.shouldExecute && result.executeSize) {
    await executePartialOrder(order, price.price, result.executeSize, allOrders);

    if (result.isComplete) {
      // Mark order as complete
      const orderIndex = allOrders.findIndex((o: any) => o.id === order.id);
      if (orderIndex !== -1) {
        allOrders[orderIndex].status = 'COMPLETED';
        allOrders[orderIndex].updatedAt = Date.now();
      }

      await sendNotification(
        'TWAP Order Complete',
        `TWAP order completed: ${order.size} ${order.side} @ avg price`
      );
    }
  } else if (result.isComplete) {
    // Mark as complete without execution
    const orderIndex = allOrders.findIndex((o: any) => o.id === order.id);
    if (orderIndex !== -1) {
      allOrders[orderIndex].status = 'COMPLETED';
      allOrders[orderIndex].updatedAt = Date.now();
    }
  }
}

/**
 * Execute a full order (market order)
 */
async function executeOrder(order: any, executionPrice: number, allOrders: any[], reason?: string) {
  console.log(`[AlgoEngine] Executing order ${order.id} at price ${executionPrice}`, { reason });

  // Check if we have a trading session
  if (!hasTradingSession()) {
    console.error('[AlgoEngine] No active trading session - cannot execute order');

    // Mark order as failed
    const orderIndex = allOrders.findIndex((o: any) => o.id === order.id);
    if (orderIndex !== -1) {
      allOrders[orderIndex].status = 'FAILED';
      allOrders[orderIndex].error = 'No active trading session';
      allOrders[orderIndex].updatedAt = Date.now();
    }

    await sendNotification(
      'Algo Order Failed',
      `${order.type} order failed: No active trading session. Please unlock your wallet.`
    );
    return;
  }

  // Execute the market order via CLOB client
  const result = await executeMarketOrder(order.tokenId, order.side, order.size);

  // Add to execution history
  const execution = {
    price: executionPrice,
    size: order.size,
    timestamp: Date.now(),
    reason: reason || 'Algo condition met',
    clobOrderId: result.orderId
  };

  // Update order based on result
  const orderIndex = allOrders.findIndex((o: any) => o.id === order.id);
  if (orderIndex !== -1) {
    if (result.success) {
      allOrders[orderIndex].status = 'COMPLETED';
      allOrders[orderIndex].executedSize = order.size;
      allOrders[orderIndex].executionHistory = [...(order.executionHistory || []), execution];
      allOrders[orderIndex].completedAt = Date.now();
      allOrders[orderIndex].clobOrderId = result.orderId;

      // Track algo order execution in history
      const historyEntry: OrderHistoryEntry = {
        id: `algo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        timestamp: Date.now(),
        orderType: 'ALGO',
        algoType: order.type as AlgoOrderType,
        tokenId: order.tokenId,
        side: order.side,
        size: order.size,
        price: executionPrice,
        executedPrice: executionPrice,
        status: 'EXECUTED',
        algoOrderId: order.id,
        clobOrderId: result.orderId,
        marketQuestion: order.marketQuestion,
        outcome: order.outcome
      };
      await saveOrderToHistory(historyEntry);
    } else {
      allOrders[orderIndex].status = 'FAILED';
      allOrders[orderIndex].error = result.error || 'Unknown error';

      // Track failed algo order execution
      const historyEntry: OrderHistoryEntry = {
        id: `algo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        timestamp: Date.now(),
        orderType: 'ALGO',
        algoType: order.type as AlgoOrderType,
        tokenId: order.tokenId,
        side: order.side,
        size: order.size,
        price: executionPrice,
        status: 'FAILED',
        algoOrderId: order.id,
        error: result.error || 'Unknown error',
        marketQuestion: order.marketQuestion,
        outcome: order.outcome
      };
      await saveOrderToHistory(historyEntry);
    }
    allOrders[orderIndex].updatedAt = Date.now();
  }

  // Send notification
  if (result.success) {
    await sendNotification(
      'Algo Order Executed',
      `${order.type} ${order.side} order executed: ${order.size} shares @ $${executionPrice.toFixed(4)}\nCLOB Order ID: ${result.orderId}`
    );
  } else {
    await sendNotification(
      'Algo Order Failed',
      `${order.type} order failed: ${result.error}`
    );
  }
}

/**
 * Execute a partial order (for TWAP)
 */
async function executePartialOrder(
  order: any,
  executionPrice: number,
  executeSize: number,
  allOrders: any[]
) {
  console.log(`[AlgoEngine] Executing partial order ${order.id}: ${executeSize} @ ${executionPrice}`);

  // Check if we have a trading session
  if (!hasTradingSession()) {
    console.error('[AlgoEngine] No active trading session - cannot execute TWAP slice');
    return;
  }

  // Execute the market order via CLOB client
  const result = await executeMarketOrder(order.tokenId, order.side, executeSize);

  // Add to execution history
  const execution = {
    price: executionPrice,
    size: executeSize,
    timestamp: Date.now(),
    reason: 'TWAP slice',
    clobOrderId: result.orderId,
    success: result.success
  };

  // Update order
  const orderIndex = allOrders.findIndex((o: any) => o.id === order.id);
  if (orderIndex !== -1) {
    if (result.success) {
      const currentExecutedSize = allOrders[orderIndex].executedSize || 0;
      allOrders[orderIndex].executedSize = currentExecutedSize + executeSize;
    } else {
      // Log failure but don't mark entire TWAP as failed
      console.error(`[AlgoEngine] TWAP slice failed: ${result.error}`);
    }
    allOrders[orderIndex].executionHistory = [...(order.executionHistory || []), execution];
    allOrders[orderIndex].updatedAt = Date.now();
  }
}

/**
 * Send browser notification
 */
async function sendNotification(title: string, message: string) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Check pending limit orders and update their status based on CLOB
 */
async function checkLimitOrders(prices: Map<string, any>) {
  try {
    // Get pending limit orders
    const pendingOrders = await getPendingLimitOrders();

    if (pendingOrders.length === 0) {
      return;
    }

    console.log(`[AlgoEngine] Checking ${pendingOrders.length} pending limit orders`);

    // Fetch current open orders from CLOB to check fill status
    const clobResult = await getOpenOrders();

    if (!clobResult.success) {
      console.warn('[AlgoEngine] Could not fetch CLOB orders to check limit order status');
      return;
    }

    const clobOrders = clobResult.data || [];
    const clobOrderIds = new Set(clobOrders.map((o: any) => o.id));

    // Check each pending limit order
    for (const order of pendingOrders) {
      if (!order.clobOrderId) {
        continue;
      }

      // If order is not in CLOB anymore, it was likely filled or cancelled
      if (!clobOrderIds.has(order.clobOrderId)) {
        console.log(`[AlgoEngine] Limit order ${order.id} not found in CLOB - may be filled`);

        // Mark as filled
        await updateLimitOrder(order.id, {
          status: 'FILLED',
          filledAt: Date.now(),
          filledPrice: order.limitPrice, // We don't know exact fill price from this check
        });

        // Track in order history
        await updateOrderHistoryEntry(order.id, {
          status: 'EXECUTED',
          executedPrice: order.limitPrice,
        });

        // Send notification
        await sendNotification(
          'Limit Order Filled',
          `${order.side} ${order.size} @ $${order.limitPrice.toFixed(4)}\n${order.marketQuestion || order.tokenId}`
        );

        console.log(`[AlgoEngine] ✅ Limit order filled: ${order.id}`);
      }
    }
  } catch (error) {
    console.error('[AlgoEngine] Error checking limit orders:', error);
  }
}
