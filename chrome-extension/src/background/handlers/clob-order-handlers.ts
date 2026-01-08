import { getE2EOverrides } from './e2e-overrides';

export async function handleGetClobOrders() {
  try {
    const overrides = await getE2EOverrides();
    if (overrides?.clobOrdersError) {
      throw new Error(overrides.clobOrdersError);
    }
    if (overrides?.clobOrders) {
      return { success: true, data: overrides.clobOrders };
    }

    console.log('[ServiceWorker] Fetching CLOB orders');
    const { getOpenOrders } = await import('../trading-session');
    const result = await getOpenOrders();

    if (!result.success) {
      const errorMessage = result.error || 'Failed to fetch CLOB orders';
      if (errorMessage.includes('No active trading session')) {
        console.warn('[ServiceWorker] No active trading session for CLOB orders');
        return { success: false, error: errorMessage };
      }
      throw new Error(errorMessage);
    }

    console.log('[ServiceWorker] Found', result.data?.length || 0, 'CLOB orders');
    return { success: true, data: result.data || [] };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get CLOB orders:', error);
    throw error;
  }
}
