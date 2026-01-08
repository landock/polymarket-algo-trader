import type { PolymarketPosition } from '../../shared/types/positions';
import { clearPositionsCache, fetchPositions, refreshPositions } from '../positions-fetcher';
import { getE2EOverrides } from './e2e-overrides';

export async function handleGetPositions(proxyAddress: string) {
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

export async function handleRefreshPositions(proxyAddress: string) {
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

export async function handleQuickSellPosition(position: PolymarketPosition) {
  try {
    console.log('[ServiceWorker] Quick selling position:', position.title, position.outcome);

    const { executeMarketOrder } = await import('../trading-session');
    const result = await executeMarketOrder(
      position.asset,
      'SELL',
      position.size
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to execute sell order');
    }

    await clearPositionsCache();

    console.log('[ServiceWorker] Position sold successfully, order ID:', result.orderId);
    return { success: true, orderId: result.orderId };
  } catch (error) {
    console.error('[ServiceWorker] Failed to sell position:', error);
    throw error;
  }
}

export async function handleRedeemPosition(position: PolymarketPosition) {
  try {
    console.log('[ServiceWorker] Redeeming position:', position.title, position.outcome);

    console.warn('[ServiceWorker] ⚠️ Redeem functionality not yet implemented');
    return {
      success: false,
      error: 'Redeem functionality coming soon. Please use Polymarket.com to redeem for now.'
    };
  } catch (error) {
    console.error('[ServiceWorker] Failed to redeem position:', error);
    throw error;
  }
}
