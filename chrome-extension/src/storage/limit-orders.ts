/**
 * Limit Orders Storage Service
 *
 * Manages persistent storage of pending limit orders in chrome.storage.local
 */

import { OrderSide } from '../shared/types';
import { storageAdapter } from './storage-adapter';

const LIMIT_ORDERS_KEY = 'limit_orders';

export type LimitOrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED';

export interface LimitOrder {
  id: string;
  tokenId: string;
  marketQuestion?: string;
  outcome?: string;
  side: OrderSide;
  size: number;
  limitPrice: number;
  status: LimitOrderStatus;
  createdAt: number;
  clobOrderId?: string;
  filledAt?: number;
  filledPrice?: number;
  cancelledAt?: number;
  error?: string;
}

/**
 * Get all limit orders
 */
export async function getLimitOrders(): Promise<LimitOrder[]> {
  const orders = await storageAdapter.get<LimitOrder[]>(LIMIT_ORDERS_KEY);
  return orders || [];
}

/**
 * Get pending limit orders only
 */
export async function getPendingLimitOrders(): Promise<LimitOrder[]> {
  const orders = await getLimitOrders();
  return orders.filter(order => order.status === 'PENDING');
}

/**
 * Get limit orders for a specific token
 */
export async function getLimitOrdersByToken(tokenId: string): Promise<LimitOrder[]> {
  const orders = await getLimitOrders();
  return orders.filter(order => order.tokenId === tokenId);
}

/**
 * Create a new limit order
 */
export async function createLimitOrder(
  order: Omit<LimitOrder, 'id' | 'createdAt' | 'status'>
): Promise<LimitOrder> {
  const orders = await getLimitOrders();

  const newOrder: LimitOrder = {
    ...order,
    id: `limit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    createdAt: Date.now(),
    status: 'PENDING',
  };

  orders.unshift(newOrder);
  await storageAdapter.set(LIMIT_ORDERS_KEY, orders);

  return newOrder;
}

/**
 * Update a limit order
 */
export async function updateLimitOrder(
  id: string,
  updates: Partial<LimitOrder>
): Promise<void> {
  const orders = await getLimitOrders();
  const index = orders.findIndex(order => order.id === id);

  if (index !== -1) {
    orders[index] = { ...orders[index], ...updates };
    await storageAdapter.set(LIMIT_ORDERS_KEY, orders);
  }
}

/**
 * Update limit order by CLOB order ID
 */
export async function updateLimitOrderByClobId(
  clobOrderId: string,
  updates: Partial<LimitOrder>
): Promise<void> {
  const orders = await getLimitOrders();
  const index = orders.findIndex(order => order.clobOrderId === clobOrderId);

  if (index !== -1) {
    orders[index] = { ...orders[index], ...updates };
    await storageAdapter.set(LIMIT_ORDERS_KEY, orders);
  }
}

/**
 * Cancel a limit order
 */
export async function cancelLimitOrder(id: string): Promise<void> {
  await updateLimitOrder(id, {
    status: 'CANCELLED',
    cancelledAt: Date.now(),
  });
}

/**
 * Delete a limit order
 */
export async function deleteLimitOrder(id: string): Promise<void> {
  const orders = await getLimitOrders();
  const filtered = orders.filter(order => order.id !== id);
  await storageAdapter.set(LIMIT_ORDERS_KEY, filtered);
}

/**
 * Clear all limit orders
 */
export async function clearLimitOrders(): Promise<void> {
  await storageAdapter.remove(LIMIT_ORDERS_KEY);
}

/**
 * Get active token IDs from pending limit orders
 */
export async function getActiveLimitOrderTokenIds(): Promise<string[]> {
  const pendingOrders = await getPendingLimitOrders();
  const tokenIds = new Set(pendingOrders.map(order => order.tokenId));
  return Array.from(tokenIds);
}
