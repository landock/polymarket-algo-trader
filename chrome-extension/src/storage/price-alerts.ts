/**
 * Price Alert Storage Service
 *
 * Manages persistent storage of price alerts in chrome.storage.local
 */

import { PriceAlert, PriceAlertCondition, PriceAlertStatus, PriceAlertTrigger } from '../shared/types';
import { storageAdapter } from './storage-adapter';

const PRICE_ALERTS_KEY = 'price_alerts';
const ALERT_HISTORY_KEY = 'price_alert_history';
const MAX_HISTORY_ENTRIES = 100; // Limit history to prevent storage bloat

/**
 * Create a new price alert
 */
export async function createPriceAlert(
  tokenId: string,
  condition: PriceAlertCondition,
  targetPrice: number,
  marketQuestion?: string,
  outcome?: string
): Promise<PriceAlert> {
  const alerts = await getPriceAlerts();

  const alert: PriceAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tokenId,
    marketQuestion,
    outcome,
    condition,
    targetPrice,
    status: 'ACTIVE',
    createdAt: Date.now()
  };

  alerts.push(alert);
  await storageAdapter.set(PRICE_ALERTS_KEY, alerts);

  console.log('[PriceAlerts] Created alert:', alert.id);
  return alert;
}

/**
 * Get all price alerts
 */
export async function getPriceAlerts(): Promise<PriceAlert[]> {
  const alerts = await storageAdapter.get<PriceAlert[]>(PRICE_ALERTS_KEY);
  return alerts || [];
}

/**
 * Get active price alerts (not triggered, dismissed, or snoozed)
 */
export async function getActivePriceAlerts(): Promise<PriceAlert[]> {
  const alerts = await getPriceAlerts();
  const now = Date.now();

  return alerts.filter(alert => {
    if (alert.status !== 'ACTIVE' && alert.status !== 'SNOOZED') {
      return false;
    }

    // If snoozed, check if snooze period has expired
    if (alert.status === 'SNOOZED' && alert.snoozedUntil) {
      return now >= alert.snoozedUntil;
    }

    return true;
  });
}

/**
 * Get alerts for a specific token
 */
export async function getAlertsForToken(tokenId: string): Promise<PriceAlert[]> {
  const alerts = await getPriceAlerts();
  return alerts.filter(alert => alert.tokenId === tokenId);
}

/**
 * Update a price alert
 */
export async function updatePriceAlert(
  id: string,
  updates: Partial<PriceAlert>
): Promise<void> {
  const alerts = await getPriceAlerts();
  const index = alerts.findIndex(alert => alert.id === id);

  if (index !== -1) {
    alerts[index] = { ...alerts[index], ...updates };
    await storageAdapter.set(PRICE_ALERTS_KEY, alerts);
    console.log('[PriceAlerts] Updated alert:', id);
  }
}

/**
 * Delete a price alert
 */
export async function deletePriceAlert(id: string): Promise<void> {
  const alerts = await getPriceAlerts();
  const filtered = alerts.filter(alert => alert.id !== id);
  await storageAdapter.set(PRICE_ALERTS_KEY, filtered);
  console.log('[PriceAlerts] Deleted alert:', id);
}

/**
 * Snooze an alert for a specified duration
 */
export async function snoozePriceAlert(id: string, durationMinutes: number = 60): Promise<void> {
  const snoozedUntil = Date.now() + (durationMinutes * 60 * 1000);
  await updatePriceAlert(id, {
    status: 'SNOOZED',
    snoozedUntil
  });
  console.log('[PriceAlerts] Snoozed alert:', id, 'until', new Date(snoozedUntil).toLocaleString());
}

/**
 * Dismiss an alert (mark as dismissed)
 */
export async function dismissPriceAlert(id: string): Promise<void> {
  await updatePriceAlert(id, {
    status: 'DISMISSED'
  });
  console.log('[PriceAlerts] Dismissed alert:', id);
}

/**
 * Trigger an alert (mark as triggered and save to history)
 */
export async function triggerPriceAlert(alert: PriceAlert, currentPrice: number): Promise<void> {
  const triggeredAt = Date.now();

  // Update alert status
  await updatePriceAlert(alert.id, {
    status: 'TRIGGERED',
    triggeredAt
  });

  // Save to history
  await saveAlertTriggerToHistory({
    alert: { ...alert, status: 'TRIGGERED', triggeredAt },
    currentPrice,
    timestamp: triggeredAt
  });

  console.log('[PriceAlerts] Triggered alert:', alert.id, 'at price', currentPrice);
}

/**
 * Save alert trigger to history
 */
async function saveAlertTriggerToHistory(trigger: PriceAlertTrigger): Promise<void> {
  const history = await getAlertHistory();

  // Add new entry at the beginning (most recent first)
  history.unshift(trigger);

  // Trim to max entries
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.splice(MAX_HISTORY_ENTRIES);
  }

  await storageAdapter.set(ALERT_HISTORY_KEY, history);
}

/**
 * Get alert trigger history
 */
export async function getAlertHistory(): Promise<PriceAlertTrigger[]> {
  const history = await storageAdapter.get<PriceAlertTrigger[]>(ALERT_HISTORY_KEY);
  return history || [];
}

/**
 * Clear all price alerts
 */
export async function clearAllPriceAlerts(): Promise<void> {
  await storageAdapter.remove(PRICE_ALERTS_KEY);
  console.log('[PriceAlerts] Cleared all alerts');
}

/**
 * Clear alert history
 */
export async function clearAlertHistory(): Promise<void> {
  await storageAdapter.remove(ALERT_HISTORY_KEY);
  console.log('[PriceAlerts] Cleared alert history');
}

/**
 * Check if a price triggers an alert
 */
export function shouldTriggerAlert(alert: PriceAlert, currentPrice: number): boolean {
  if (alert.condition === 'ABOVE') {
    return currentPrice >= alert.targetPrice;
  } else {
    return currentPrice <= alert.targetPrice;
  }
}
