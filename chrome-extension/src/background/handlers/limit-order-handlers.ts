import type { LimitOrder } from '../../storage/limit-orders';
import { cancelLimitOrder, createLimitOrder, deleteLimitOrder, getLimitOrders, getPendingLimitOrders } from '../../storage/limit-orders';
export async function handleGetLimitOrders() {
  try {
    const orders = await getLimitOrders();
    return { success: true, data: orders };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get limit orders:', error);
    throw error;
  }
}

export async function handleGetPendingLimitOrders() {
  try {
    const orders = await getPendingLimitOrders();
    return { success: true, data: orders };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get pending limit orders:', error);
    throw error;
  }
}

export async function handleCreateLimitOrder(order: Omit<LimitOrder, 'id' | 'createdAt' | 'status'>) {
  try {
    console.log('[ServiceWorker] Creating limit order:', order);

    const { executeLimitOrder } = await import('../trading-session');
    const result = await executeLimitOrder(
      order.tokenId,
      order.side,
      order.size,
      order.limitPrice
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to create limit order');
    }

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

export async function handleCancelLimitOrder(orderId: string) {
  try {
    console.log('[ServiceWorker] Cancelling limit order:', orderId);

    const orders = await getLimitOrders();
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      throw new Error('Limit order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    if (order.clobOrderId) {
      const { getActiveTradingSession } = await import('../trading-session');
      const tradingSession = getActiveTradingSession();

      if (tradingSession?.clobClient) {
        try {
          await tradingSession.clobClient.cancelOrder({ orderID: order.clobOrderId });
          console.log('[ServiceWorker] CLOB order cancelled:', order.clobOrderId);
        } catch (error) {
          console.error('[ServiceWorker] Failed to cancel CLOB order:', error);
        }
      }
    }

    await cancelLimitOrder(orderId);

    console.log('[ServiceWorker] Limit order cancelled:', orderId);

    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to cancel limit order:', error);
    throw error;
  }
}

export async function handleDeleteLimitOrder(orderId: string) {
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
