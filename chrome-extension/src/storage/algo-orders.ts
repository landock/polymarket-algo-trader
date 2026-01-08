/**
 * Algo Orders Storage Service
 *
 * Manages persistent storage of algo orders in chrome.storage.local
 */

import type { AlgoOrder } from '../shared/types';
import { storageAdapter } from './storage-adapter';

const ALGO_ORDERS_KEY = 'algo_orders';

export async function getAlgoOrders(): Promise<AlgoOrder[]> {
  const orders = await storageAdapter.get<AlgoOrder[]>(ALGO_ORDERS_KEY);
  return orders || [];
}

export async function setAlgoOrders(orders: AlgoOrder[]): Promise<void> {
  await storageAdapter.set(ALGO_ORDERS_KEY, orders);
}

export async function addAlgoOrder(order: AlgoOrder): Promise<void> {
  const orders = await getAlgoOrders();
  orders.push(order);
  await setAlgoOrders(orders);
}

export async function updateAlgoOrder(orderId: string, updates: Partial<AlgoOrder>): Promise<boolean> {
  const orders = await getAlgoOrders();
  const orderIndex = orders.findIndex((order) => order.id === orderId);

  if (orderIndex === -1) {
    return false;
  }

  orders[orderIndex] = { ...orders[orderIndex], ...updates };
  await setAlgoOrders(orders);
  return true;
}
