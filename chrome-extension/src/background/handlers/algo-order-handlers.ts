import type { AlgoOrder, AlgoOrderParams, CreateAlgoOrderRequest } from '../../shared/types';
import { addAlgoOrder, getAlgoOrders, updateAlgoOrder } from '../../storage/algo-orders';

export async function handleCreateAlgoOrder(orderData: CreateAlgoOrderRequest) {
  try {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const algoOrder: AlgoOrder = {
      id: orderId,
      type: orderData.type,
      status: 'ACTIVE',
      tokenId: orderData.tokenId,
      side: orderData.side,
      size: orderData.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      params: {} as AlgoOrderParams,
      executionHistory: []
    };

    if (orderData.type === 'TRAILING_STOP') {
      algoOrder.params = {
        trailPercent: orderData.trailPercent as number,
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
        durationMinutes: orderData.durationMinutes as number,
        intervalMinutes: orderData.intervalMinutes as number,
        startTime: Date.now()
      };
      algoOrder.executedSize = 0;
    }

    await addAlgoOrder(algoOrder);

    console.log('Algo order created:', orderId, algoOrder);

    return { success: true, orderId, order: algoOrder };
  } catch (error) {
    console.error('Failed to create algo order:', error);
    throw error;
  }
}

export async function handlePauseAlgoOrder(orderId: string) {
  try {
    const updated = await updateAlgoOrder(orderId, {
      status: 'PAUSED',
      updatedAt: Date.now()
    });

    if (!updated) {
      throw new Error('Order not found');
    }

    console.log('Algo order paused:', orderId);

    return { success: true };
  } catch (error) {
    console.error('Failed to pause algo order:', error);
    throw error;
  }
}

export async function handleResumeAlgoOrder(orderId: string) {
  try {
    const updated = await updateAlgoOrder(orderId, {
      status: 'ACTIVE',
      updatedAt: Date.now()
    });

    if (!updated) {
      throw new Error('Order not found');
    }

    console.log('Algo order resumed:', orderId);

    return { success: true };
  } catch (error) {
    console.error('Failed to resume algo order:', error);
    throw error;
  }
}

export async function handleCancelAlgoOrder(orderId: string) {
  try {
    const updated = await updateAlgoOrder(orderId, {
      status: 'CANCELLED',
      updatedAt: Date.now()
    });

    if (!updated) {
      throw new Error('Order not found');
    }

    console.log('Algo order cancelled:', orderId);

    return { success: true };
  } catch (error) {
    console.error('Failed to cancel algo order:', error);
    throw error;
  }
}

export async function handleGetAlgoOrders() {
  try {
    const orders = await getAlgoOrders();
    return { success: true, data: orders };
  } catch (error) {
    console.error('Failed to get algo orders:', error);
    throw error;
  }
}
