/**
 * Order History Storage Service
 *
 * Manages persistent storage of order execution history in chrome.storage.local
 */

import { OrderHistoryEntry } from '../shared/types';
import { storageAdapter } from './storage-adapter';

const ORDER_HISTORY_KEY = 'order_history';
const MAX_HISTORY_ENTRIES = 1000; // Limit to prevent storage bloat

/**
 * Save a new order to history
 */
export async function saveOrderToHistory(entry: OrderHistoryEntry): Promise<void> {
  const history = await getOrderHistory();

  // Add new entry at the beginning (most recent first)
  history.unshift(entry);

  // Trim to max entries
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.splice(MAX_HISTORY_ENTRIES);
  }

  await storageAdapter.set(ORDER_HISTORY_KEY, history);
}

/**
 * Get all order history
 */
export async function getOrderHistory(): Promise<OrderHistoryEntry[]> {
  const history = await storageAdapter.get<OrderHistoryEntry[]>(ORDER_HISTORY_KEY);
  return history || [];
}

/**
 * Get order history with filtering
 */
export interface OrderHistoryFilters {
  startDate?: number;
  endDate?: number;
  orderType?: 'MARKET' | 'LIMIT' | 'ALGO';
  tokenId?: string;
  side?: 'BUY' | 'SELL';
  status?: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
}

export async function getFilteredOrderHistory(
  filters: OrderHistoryFilters
): Promise<OrderHistoryEntry[]> {
  const history = await getOrderHistory();

  return history.filter(entry => {
    if (filters.startDate && entry.timestamp < filters.startDate) return false;
    if (filters.endDate && entry.timestamp > filters.endDate) return false;
    if (filters.orderType && entry.orderType !== filters.orderType) return false;
    if (filters.tokenId && entry.tokenId !== filters.tokenId) return false;
    if (filters.side && entry.side !== filters.side) return false;
    if (filters.status && entry.status !== filters.status) return false;
    return true;
  });
}

/**
 * Update an existing order history entry
 */
export async function updateOrderHistoryEntry(
  id: string,
  updates: Partial<OrderHistoryEntry>
): Promise<void> {
  const history = await getOrderHistory();
  const index = history.findIndex(entry => entry.id === id);

  if (index !== -1) {
    history[index] = { ...history[index], ...updates };
    await storageAdapter.set(ORDER_HISTORY_KEY, history);
  }
}

/**
 * Clear all order history
 */
export async function clearOrderHistory(): Promise<void> {
  await storageAdapter.remove(ORDER_HISTORY_KEY);
}

/**
 * Get order history count
 */
export async function getOrderHistoryCount(): Promise<number> {
  const history = await getOrderHistory();
  return history.length;
}

/**
 * Get order history for a specific token
 */
export async function getOrderHistoryByToken(tokenId: string): Promise<OrderHistoryEntry[]> {
  const history = await getOrderHistory();
  return history.filter(entry => entry.tokenId === tokenId);
}

/**
 * Get recent order history (last N entries)
 */
export async function getRecentOrderHistory(limit: number = 10): Promise<OrderHistoryEntry[]> {
  const history = await getOrderHistory();
  return history.slice(0, limit);
}
