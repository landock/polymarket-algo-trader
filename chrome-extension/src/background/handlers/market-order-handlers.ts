import type { CreateMarketOrderRequest } from '../../shared/types';

export async function handleExecuteMarketOrder(order: CreateMarketOrderRequest) {
  try {
    console.log('[ServiceWorker] Executing market order:', order);

    const { executeMarketOrder } = await import('../trading-session');
    const result = await executeMarketOrder(order.tokenId, order.side, order.size);

    if (!result.success) {
      throw new Error(result.error || 'Failed to execute market order');
    }

    return { success: true, orderId: result.orderId };
  } catch (error) {
    console.error('[ServiceWorker] Failed to execute market order:', error);
    throw error;
  }
}
