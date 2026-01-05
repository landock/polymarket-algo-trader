/**
 * Background Service Worker
 *
 * Handles 24/7 market monitoring and algorithmic order execution
 */

// Polyfill Buffer for service worker (needed by ethers.js and CLOB client)
import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;

import { setupMarketMonitor } from './market-monitor';
import { tickAlgoEngine } from './algo-engine';
import { initializeTradingSession, clearTradingSession, executeMarketOrder, executeLimitOrder, getOpenOrders, getWalletAddresses } from './trading-session';
import { testServiceWorkerDependencies } from './dependency-test';
import { fetchPositions, clearPositionsCache, refreshPositions } from './positions-fetcher';
import type { PolymarketPosition } from '../shared/types/positions';
import { checkPriceAlerts, setupNotificationHandlers } from './alert-monitor';
import { getPriceAlerts, createPriceAlert, updatePriceAlert, deletePriceAlert, snoozePriceAlert, dismissPriceAlert, getAlertHistory } from '../storage/price-alerts';
import { fetchPortfolioMetrics } from './portfolio-service';
import { getLimitOrders, getPendingLimitOrders, createLimitOrder, cancelLimitOrder, deleteLimitOrder } from '../storage/limit-orders';
import type { LimitOrder } from '../storage/limit-orders';
import { getRiskSettings, updateRiskSettings, resetRiskSettings, getTodayLossTracking } from '../storage/risk-settings';

interface E2EOverrides {
  walletAddresses?: { eoaAddress: string; proxyAddress: string };
  positions?: PolymarketPosition[];
  positionsError?: string;
  clobOrders?: any[];
  clobOrdersError?: string;
}

async function getE2EOverrides(): Promise<E2EOverrides | null> {
  try {
    const result = await chrome.storage.local.get('e2e_overrides');
    return result.e2e_overrides || null;
  } catch (error) {
    console.error('[ServiceWorker] Failed to load e2e overrides:', error);
    return null;
  }
}

// Service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Polymarket Algo Trader installed', details.reason);

  // Set up market monitoring (every 10 seconds)
  setupMarketMonitor(10);

  // Set up notification handlers for price alerts
  setupNotificationHandlers();
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'market-monitor') {
    console.log('[ServiceWorker] Market monitor tick');
    await tickAlgoEngine();
    // Also check price alerts on each monitor tick
    await checkPriceAlerts();
  }
});

// Handle messages from content script/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);

  // Wrap async operations in an immediately invoked async function
  (async () => {
    try {
      let result;

      switch (message.type) {
        case 'INITIALIZE_TRADING_SESSION':
          result = await handleInitializeTradingSession(message.privateKey, message.proxyAddress);
          break;

        case 'CLEAR_TRADING_SESSION':
          result = await handleClearTradingSession();
          break;

        case 'GET_WALLET_ADDRESSES':
          result = await handleGetWalletAddresses();
          break;

        case 'CREATE_ALGO_ORDER':
          result = await handleCreateAlgoOrder(message.order);
          break;

        case 'PAUSE_ALGO_ORDER':
          result = await handlePauseAlgoOrder(message.orderId);
          break;

        case 'RESUME_ALGO_ORDER':
          result = await handleResumeAlgoOrder(message.orderId);
          break;

        case 'CANCEL_ALGO_ORDER':
          result = await handleCancelAlgoOrder(message.orderId);
          break;

        case 'GET_ALGO_ORDERS':
          result = await handleGetAlgoOrders();
          break;

        case 'GET_CLOB_ORDERS':
          result = await handleGetClobOrders();
          break;

        case 'GET_POSITIONS':
          result = await handleGetPositions(message.proxyAddress);
          break;

        case 'REFRESH_POSITIONS':
          result = await handleRefreshPositions(message.proxyAddress);
          break;

        case 'QUICK_SELL_POSITION':
          result = await handleQuickSellPosition(message.position);
          break;

        case 'REDEEM_POSITION':
          result = await handleRedeemPosition(message.position);
          break;

        case 'GET_PRICE_ALERTS':
          result = await handleGetPriceAlerts();
          break;

        case 'CREATE_PRICE_ALERT':
          result = await handleCreatePriceAlert(message.alert);
          break;

        case 'UPDATE_PRICE_ALERT':
          result = await handleUpdatePriceAlert(message.alertId, message.updates);
          break;

        case 'DELETE_PRICE_ALERT':
          result = await handleDeletePriceAlert(message.alertId);
          break;

        case 'SNOOZE_PRICE_ALERT':
          result = await handleSnoozePriceAlert(message.alertId, message.durationMinutes);
          break;

        case 'DISMISS_PRICE_ALERT':
          result = await handleDismissPriceAlert(message.alertId);
          break;

        case 'GET_ALERT_HISTORY':
          result = await handleGetAlertHistory();
          break;

        case 'GET_PORTFOLIO':
          result = await handleGetPortfolio(message.proxyAddress);
          break;

        case 'GET_LIMIT_ORDERS':
          result = await handleGetLimitOrders();
          break;

        case 'GET_PENDING_LIMIT_ORDERS':
          result = await handleGetPendingLimitOrders();
          break;

        case 'CREATE_LIMIT_ORDER':
          result = await handleCreateLimitOrder(message.order);
          break;

        case 'CANCEL_LIMIT_ORDER':
          result = await handleCancelLimitOrder(message.orderId);
          break;

        case 'DELETE_LIMIT_ORDER':
          result = await handleDeleteLimitOrder(message.orderId);
          break;

        case 'GET_RISK_SETTINGS':
          result = await handleGetRiskSettings();
          break;

        case 'UPDATE_RISK_SETTINGS':
          result = await handleUpdateRiskSettings(message.payload);
          break;

        case 'RESET_RISK_SETTINGS':
          result = await handleResetRiskSettings();
          break;

        case 'GET_DAILY_LOSS':
          result = await handleGetDailyLoss();
          break;

        default:
          result = { success: false, error: 'Unknown message type' };
      }

      // Try to send response, catch if channel closed
      try {
        sendResponse(result);
      } catch (sendError) {
        console.error('[ServiceWorker] Failed to send response (channel may be closed):', sendError);
      }
    } catch (error: any) {
      console.error('[ServiceWorker] Message handler error:', error);
      // Try to send error response, catch if channel closed
      try {
        sendResponse({
          success: false,
          error: error?.message || String(error) || 'Unknown error'
        });
      } catch (sendError) {
        console.error('[ServiceWorker] Failed to send error response (channel may be closed):', sendError);
      }
    }
  })();

  return true; // Keep message channel open for async response
});

/**
 * Initialize trading session with decrypted private key
 */
async function handleInitializeTradingSession(privateKey: string, proxyAddress?: string) {
  try {
    const overrides = await getE2EOverrides();
    if (overrides?.walletAddresses) {
      console.log('[ServiceWorker] Using e2e wallet override');
      return { success: true };
    }

    await initializeTradingSession(privateKey, proxyAddress);
    console.log('[ServiceWorker] Trading session initialized');
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to initialize trading session:', error);
    throw error;
  }
}

/**
 * Clear the trading session
 */
async function handleClearTradingSession() {
  try {
    clearTradingSession();
    console.log('[ServiceWorker] Trading session cleared');
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to clear trading session:', error);
    throw error;
  }
}

/**
 * Get wallet addresses (EOA and proxy)
 */
async function handleGetWalletAddresses() {
  try {
    const overrides = await getE2EOverrides();
    if (overrides?.walletAddresses) {
      return { success: true, data: overrides.walletAddresses };
    }

    const addresses = getWalletAddresses();

    if (!addresses) {
      return { success: false, error: 'No active trading session' };
    }

    console.log('[ServiceWorker] Wallet addresses:', addresses);
    return { success: true, data: addresses };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get wallet addresses:', error);
    throw error;
  }
}

/**
 * Create a new algorithmic order
 */
async function handleCreateAlgoOrder(orderData: any) {
  try {
    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Create AlgoOrder object
    const algoOrder: any = {
      id: orderId,
      type: orderData.type,
      status: 'ACTIVE',
      tokenId: orderData.tokenId,
      side: orderData.side,
      size: orderData.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      params: {},
      executionHistory: []
    };

    // Add type-specific parameters
    if (orderData.type === 'TRAILING_STOP') {
      algoOrder.params = {
        trailPercent: orderData.trailPercent,
        triggerPrice: orderData.triggerPrice
      };
    } else if (orderData.type === 'STOP_LOSS' || orderData.type === 'TAKE_PROFIT') {
      algoOrder.params = {
        stopLossPrice: orderData.stopLossPrice,
        takeProfitPrice: orderData.takeProfitPrice
      };
    } else if (orderData.type === 'TWAP') {
      algoOrder.params = {
        totalSize: orderData.size,
        durationMinutes: orderData.durationMinutes,
        intervalMinutes: orderData.intervalMinutes,
        startTime: Date.now()
      };
      algoOrder.executedSize = 0;
    }

    // Load existing orders
    const result = await chrome.storage.local.get('algo_orders');
    const orders = result.algo_orders || [];

    // Add new order
    orders.push(algoOrder);

    // Save back to storage
    await chrome.storage.local.set({ algo_orders: orders });

    console.log('Algo order created:', orderId, algoOrder);

    return { success: true, orderId, order: algoOrder };
  } catch (error) {
    console.error('Failed to create algo order:', error);
    throw error;
  }
}

/**
 * Pause an active algorithmic order
 */
async function handlePauseAlgoOrder(orderId: string) {
  try {
    const result = await chrome.storage.local.get('algo_orders');
    const orders = result.algo_orders || [];

    const orderIndex = orders.findIndex((o: any) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    orders[orderIndex].status = 'PAUSED';
    orders[orderIndex].updatedAt = Date.now();

    await chrome.storage.local.set({ algo_orders: orders });

    console.log('Algo order paused:', orderId);

    return { success: true };
  } catch (error) {
    console.error('Failed to pause algo order:', error);
    throw error;
  }
}

/**
 * Resume a paused algorithmic order
 */
async function handleResumeAlgoOrder(orderId: string) {
  try {
    const result = await chrome.storage.local.get('algo_orders');
    const orders = result.algo_orders || [];

    const orderIndex = orders.findIndex((o: any) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    orders[orderIndex].status = 'ACTIVE';
    orders[orderIndex].updatedAt = Date.now();

    await chrome.storage.local.set({ algo_orders: orders });

    console.log('Algo order resumed:', orderId);

    return { success: true };
  } catch (error) {
    console.error('Failed to resume algo order:', error);
    throw error;
  }
}

/**
 * Cancel an algorithmic order
 */
async function handleCancelAlgoOrder(orderId: string) {
  try {
    const result = await chrome.storage.local.get('algo_orders');
    const orders = result.algo_orders || [];

    const orderIndex = orders.findIndex((o: any) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    orders[orderIndex].status = 'CANCELLED';
    orders[orderIndex].updatedAt = Date.now();

    await chrome.storage.local.set({ algo_orders: orders });

    console.log('Algo order cancelled:', orderId);

    return { success: true };
  } catch (error) {
    console.error('Failed to cancel algo order:', error);
    throw error;
  }
}

/**
 * Get all algorithmic orders
 */
async function handleGetAlgoOrders() {
  try {
    const result = await chrome.storage.local.get('algo_orders');
    const orders = result.algo_orders || [];

    return { success: true, data: orders };
  } catch (error) {
    console.error('Failed to get algo orders:', error);
    throw error;
  }
}

/**
 * Get real orders from Polymarket CLOB
 */
async function handleGetClobOrders() {
  try {
    const overrides = await getE2EOverrides();
    if (overrides?.clobOrdersError) {
      throw new Error(overrides.clobOrdersError);
    }
    if (overrides?.clobOrders) {
      return { success: true, data: overrides.clobOrders };
    }

    console.log('[ServiceWorker] Fetching CLOB orders');
    const result = await getOpenOrders();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch CLOB orders');
    }

    console.log('[ServiceWorker] Found', result.data?.length || 0, 'CLOB orders');
    return { success: true, data: result.data || [] };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get CLOB orders:', error);
    throw error;
  }
}

/**
 * Get user positions from Polymarket Data API
 */
async function handleGetPositions(proxyAddress: string) {
  try {
    const overrides = await getE2EOverrides();
    if (overrides?.positionsError) {
      throw new Error(overrides.positionsError);
    }
    if (overrides?.positions) {
      return { success: true, data: overrides.positions };
    }

    console.log('[ServiceWorker] Fetching positions for:', proxyAddress);
    const positions = await fetchPositions(proxyAddress);
    console.log('[ServiceWorker] Found', positions.length, 'positions');
    return { success: true, data: positions };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get positions:', error);
    throw error;
  }
}

/**
 * Force refresh positions (bypass cache)
 */
async function handleRefreshPositions(proxyAddress: string) {
  try {
    const overrides = await getE2EOverrides();
    if (overrides?.positionsError) {
      throw new Error(overrides.positionsError);
    }
    if (overrides?.positions) {
      return { success: true, data: overrides.positions };
    }

    console.log('[ServiceWorker] Force refreshing positions for:', proxyAddress);
    const positions = await refreshPositions(proxyAddress);
    console.log('[ServiceWorker] Refreshed', positions.length, 'positions');
    return { success: true, data: positions };
  } catch (error) {
    console.error('[ServiceWorker] Failed to refresh positions:', error);
    throw error;
  }
}

/**
 * Quick sell a position (immediate market sell)
 */
async function handleQuickSellPosition(position: PolymarketPosition) {
  try {
    console.log('[ServiceWorker] Quick selling position:', position.title, position.outcome);

    // Execute market sell order
    const result = await executeMarketOrder(
      position.asset,
      'SELL',
      position.size
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to execute sell order');
    }

    // Clear positions cache to force refresh
    await clearPositionsCache();

    console.log('[ServiceWorker] Position sold successfully, order ID:', result.orderId);
    return { success: true, orderId: result.orderId };
  } catch (error) {
    console.error('[ServiceWorker] Failed to sell position:', error);
    throw error;
  }
}

/**
 * Redeem a resolved position
 */
async function handleRedeemPosition(position: PolymarketPosition) {
  try {
    console.log('[ServiceWorker] Redeeming position:', position.title, position.outcome);

    // TODO: Implement CTF contract interaction for redemption
    // This requires:
    // 1. Get trading session
    // 2. Call redeemPositions() on CTF Exchange contract
    // 3. Wait for transaction confirmation
    // For now, return a placeholder response

    console.warn('[ServiceWorker] ⚠️ Redeem functionality not yet implemented');
    return {
      success: false,
      error: 'Redeem functionality coming soon. Please use Polymarket.com to redeem for now.'
    };

    // Future implementation:
    // const session = getActiveTradingSession();
    // if (!session) throw new Error('No active trading session');
    //
    // const txHash = await redeemConditionalTokens(
    //   position.conditionId,
    //   position.size,
    //   position.outcomeIndex,
    //   session
    // );
    //
    // await clearPositionsCache();
    // return { success: true, txHash };
  } catch (error) {
    console.error('[ServiceWorker] Failed to redeem position:', error);
    throw error;
  }
}

/**
 * Get all price alerts
 */
async function handleGetPriceAlerts() {
  try {
    const alerts = await getPriceAlerts();
    console.log('[ServiceWorker] Retrieved', alerts.length, 'price alerts');
    return { success: true, data: alerts };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get price alerts:', error);
    throw error;
  }
}

/**
 * Create a new price alert
 */
async function handleCreatePriceAlert(alertData: any) {
  try {
    const alert = await createPriceAlert(
      alertData.tokenId,
      alertData.condition,
      alertData.targetPrice,
      alertData.marketQuestion,
      alertData.outcome
    );
    console.log('[ServiceWorker] Created price alert:', alert.id);
    return { success: true, data: alert };
  } catch (error) {
    console.error('[ServiceWorker] Failed to create price alert:', error);
    throw error;
  }
}

/**
 * Update a price alert
 */
async function handleUpdatePriceAlert(alertId: string, updates: any) {
  try {
    await updatePriceAlert(alertId, updates);
    console.log('[ServiceWorker] Updated price alert:', alertId);
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to update price alert:', error);
    throw error;
  }
}

/**
 * Delete a price alert
 */
async function handleDeletePriceAlert(alertId: string) {
  try {
    await deletePriceAlert(alertId);
    console.log('[ServiceWorker] Deleted price alert:', alertId);
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to delete price alert:', error);
    throw error;
  }
}

/**
 * Snooze a price alert
 */
async function handleSnoozePriceAlert(alertId: string, durationMinutes?: number) {
  try {
    await snoozePriceAlert(alertId, durationMinutes);
    console.log('[ServiceWorker] Snoozed price alert:', alertId);
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to snooze price alert:', error);
    throw error;
  }
}

/**
 * Dismiss a price alert
 */
async function handleDismissPriceAlert(alertId: string) {
  try {
    await dismissPriceAlert(alertId);
    console.log('[ServiceWorker] Dismissed price alert:', alertId);
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to dismiss price alert:', error);
    throw error;
  }
}

/**
 * Get price alert history
 */
async function handleGetAlertHistory() {
  try {
    const history = await getAlertHistory();
    console.log('[ServiceWorker] Retrieved', history.length, 'alert history entries');
    return { success: true, data: history };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get alert history:', error);
    throw error;
  }
}

/**
 * Get portfolio metrics
 */
async function handleGetPortfolio(proxyAddress?: string) {
  try {
    // Get proxy address from active session if not provided
    const addresses = proxyAddress ? { proxyAddress } : getWalletAddresses();

    if (!addresses?.proxyAddress) {
      return {
        success: false,
        error: 'No wallet address available. Please unlock your wallet first.'
      };
    }

    console.log('[ServiceWorker] Fetching portfolio metrics for', addresses.proxyAddress);

    // Fetch positions
    const positions = await fetchPositions(addresses.proxyAddress);
    console.log(`[ServiceWorker] Fetched ${positions.length} positions`);

    // Calculate portfolio metrics
    const portfolio = await fetchPortfolioMetrics(positions);
    console.log('[ServiceWorker] Portfolio metrics calculated:', portfolio.metrics);

    return {
      success: true,
      data: portfolio
    };
  } catch (error: any) {
    console.error('[ServiceWorker] Failed to fetch portfolio:', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch portfolio metrics'
    };
  }
}

/**
 * Get all limit orders
 */
async function handleGetLimitOrders() {
  try {
    const orders = await getLimitOrders();
    return { success: true, data: orders };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get limit orders:', error);
    throw error;
  }
}

/**
 * Get pending limit orders
 */
async function handleGetPendingLimitOrders() {
  try {
    const orders = await getPendingLimitOrders();
    return { success: true, data: orders };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get pending limit orders:', error);
    throw error;
  }
}

/**
 * Create a new limit order
 */
async function handleCreateLimitOrder(order: Omit<LimitOrder, 'id' | 'createdAt' | 'status'>) {
  try {
    console.log('[ServiceWorker] Creating limit order:', order);

    // Execute limit order through trading session
    const result = await executeLimitOrder(
      order.tokenId,
      order.side,
      order.size,
      order.limitPrice
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to create limit order');
    }

    // Create limit order record in storage
    const limitOrder = await createLimitOrder({
      tokenId: order.tokenId,
      marketQuestion: order.marketQuestion,
      outcome: order.outcome,
      side: order.side,
      size: order.size,
      limitPrice: order.limitPrice,
      clobOrderId: result.orderId,
    });

    console.log('[ServiceWorker] Limit order created:', limitOrder.id);

    return { success: true, data: limitOrder };
  } catch (error) {
    console.error('[ServiceWorker] Failed to create limit order:', error);
    throw error;
  }
}

/**
 * Cancel a limit order
 */
async function handleCancelLimitOrder(orderId: string) {
  try {
    console.log('[ServiceWorker] Cancelling limit order:', orderId);

    // Get the limit order to find the CLOB order ID
    const orders = await getLimitOrders();
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      throw new Error('Limit order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    // Cancel on CLOB if we have a CLOB order ID
    if (order.clobOrderId) {
      const session = await import('./trading-session');
      const tradingSession = session.getActiveTradingSession();

      if (tradingSession?.clobClient) {
        try {
          await tradingSession.clobClient.cancelOrder({ orderID: order.clobOrderId });
          console.log('[ServiceWorker] CLOB order cancelled:', order.clobOrderId);
        } catch (error) {
          console.error('[ServiceWorker] Failed to cancel CLOB order:', error);
          // Continue with local cancellation even if CLOB cancel fails
        }
      }
    }

    // Update local storage
    await cancelLimitOrder(orderId);

    console.log('[ServiceWorker] Limit order cancelled:', orderId);

    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to cancel limit order:', error);
    throw error;
  }
}

/**
 * Delete a limit order
 */
async function handleDeleteLimitOrder(orderId: string) {
  try {
    console.log('[ServiceWorker] Deleting limit order:', orderId);

    await deleteLimitOrder(orderId);

    console.log('[ServiceWorker] Limit order deleted:', orderId);

    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to delete limit order:', error);
    throw error;
  }
}

/**
 * Get risk management settings
 */
async function handleGetRiskSettings() {
  try {
    console.log('[ServiceWorker] Getting risk settings');

    const settings = await getRiskSettings();

    return { success: true, data: settings };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get risk settings:', error);
    throw error;
  }
}

/**
 * Update risk management settings
 */
async function handleUpdateRiskSettings(payload: any) {
  try {
    console.log('[ServiceWorker] Updating risk settings:', payload);

    const updated = await updateRiskSettings(payload);

    return { success: true, data: updated };
  } catch (error) {
    console.error('[ServiceWorker] Failed to update risk settings:', error);
    throw error;
  }
}

/**
 * Reset risk management settings to defaults
 */
async function handleResetRiskSettings() {
  try {
    console.log('[ServiceWorker] Resetting risk settings to defaults');

    const defaults = await resetRiskSettings();

    return { success: true, data: defaults };
  } catch (error) {
    console.error('[ServiceWorker] Failed to reset risk settings:', error);
    throw error;
  }
}

/**
 * Get today's daily loss tracking
 */
async function handleGetDailyLoss() {
  try {
    console.log('[ServiceWorker] Getting daily loss tracking');

    const tracking = await getTodayLossTracking();

    return { success: true, data: tracking };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get daily loss tracking:', error);
    throw error;
  }
}

// Graceful shutdown
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending - saving state');
  // TODO: Save any in-memory state before shutdown
});

// Log that service worker is active
console.log('Polymarket Algo Trader service worker active');

// Run dependency test on startup (in development)
if (chrome.runtime.getManifest().version) {
  setTimeout(() => {
    console.log('\n🔍 Running automatic dependency check...\n');
    testServiceWorkerDependencies().catch(err => {
      console.error('Dependency test failed:', err);
    });
  }, 1000); // Delay 1 second to let other modules load
}
