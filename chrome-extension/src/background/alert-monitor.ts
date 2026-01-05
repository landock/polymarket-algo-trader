/**
 * Price Alert Monitor
 *
 * Monitors active price alerts and triggers Chrome notifications
 */

import { PriceAlert } from '../shared/types';
import {
  getActivePriceAlerts,
  shouldTriggerAlert,
  triggerPriceAlert,
  snoozePriceAlert,
  dismissPriceAlert
} from '../storage/price-alerts';
import { fetchTokenPrice } from './market-monitor';

/**
 * Check all active price alerts and trigger notifications if conditions are met
 */
export async function checkPriceAlerts(): Promise<void> {
  try {
    const activeAlerts = await getActivePriceAlerts();

    if (activeAlerts.length === 0) {
      return;
    }

    console.log(`[AlertMonitor] Checking ${activeAlerts.length} active price alerts`);

    // Group alerts by token to minimize API calls
    const alertsByToken = new Map<string, PriceAlert[]>();
    for (const alert of activeAlerts) {
      const existing = alertsByToken.get(alert.tokenId) || [];
      existing.push(alert);
      alertsByToken.set(alert.tokenId, existing);
    }

    // Check each token's price
    for (const [tokenId, alerts] of alertsByToken.entries()) {
      await checkAlertsForToken(tokenId, alerts);
    }
  } catch (error) {
    console.error('[AlertMonitor] Error checking price alerts:', error);
  }
}

/**
 * Check alerts for a specific token
 */
async function checkAlertsForToken(tokenId: string, alerts: PriceAlert[]): Promise<void> {
  try {
    // Fetch current price
    const priceData = await fetchTokenPrice(tokenId);

    if (!priceData || priceData.price === 0) {
      console.warn(`[AlertMonitor] Could not fetch price for token ${tokenId}`);
      return;
    }

    const currentPrice = priceData.price;

    // Check each alert for this token
    for (const alert of alerts) {
      if (shouldTriggerAlert(alert, currentPrice)) {
        await handleAlertTriggered(alert, currentPrice);
      }
    }
  } catch (error) {
    console.error(`[AlertMonitor] Error checking alerts for token ${tokenId}:`, error);
  }
}

/**
 * Handle an alert being triggered
 */
async function handleAlertTriggered(alert: PriceAlert, currentPrice: number): Promise<void> {
  try {
    console.log(`[AlertMonitor] 🚨 Alert triggered! ${alert.id}`);
    console.log(`[AlertMonitor]    Market: ${alert.marketQuestion || 'Unknown'}`);
    console.log(`[AlertMonitor]    Outcome: ${alert.outcome || 'Unknown'}`);
    console.log(`[AlertMonitor]    Condition: ${alert.condition} ${alert.targetPrice}`);
    console.log(`[AlertMonitor]    Current Price: ${currentPrice}`);

    // Mark alert as triggered
    await triggerPriceAlert(alert, currentPrice);

    // Show Chrome notification
    await showAlertNotification(alert, currentPrice);
  } catch (error) {
    console.error('[AlertMonitor] Error handling triggered alert:', error);
  }
}

/**
 * Show Chrome notification for triggered alert
 */
async function showAlertNotification(alert: PriceAlert, currentPrice: number): Promise<void> {
  try {
    const conditionText = alert.condition === 'ABOVE' ? 'above' : 'below';
    const title = '🚨 Price Alert Triggered!';
    const message = `${alert.marketQuestion || 'Market'} - ${alert.outcome || 'Unknown'}
Price is now ${conditionText} $${alert.targetPrice.toFixed(4)}
Current: $${currentPrice.toFixed(4)} | Target: $${alert.targetPrice.toFixed(4)}`;

    const notificationId = await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2,
      requireInteraction: true, // Keep notification visible until user interacts
      buttons: [
        { title: 'Snooze 1hr' },
        { title: 'Dismiss' }
      ]
    });

    console.log('[AlertMonitor] Notification created:', notificationId);

    // Store notification ID with alert for cleanup
    // Note: We don't update the alert here to avoid race conditions
    // The notification ID is ephemeral and not critical to store
  } catch (error) {
    console.error('[AlertMonitor] Error showing notification:', error);
  }
}

/**
 * Handle notification button clicks
 */
export function setupNotificationHandlers(): void {
  chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    try {
      console.log(`[AlertMonitor] Notification button clicked: ${notificationId}, button ${buttonIndex}`);

      // Find the alert associated with this notification
      // Since we don't store notification IDs, we'll need to infer from context
      // For now, we'll use a simple approach: check recent triggered alerts

      const alerts = await getActivePriceAlerts();
      const recentlyTriggered = alerts.filter(a => a.status === 'TRIGGERED');

      if (recentlyTriggered.length === 0) {
        console.warn('[AlertMonitor] No recently triggered alerts found');
        chrome.notifications.clear(notificationId);
        return;
      }

      // Use the most recently triggered alert
      const alert = recentlyTriggered[recentlyTriggered.length - 1];

      if (buttonIndex === 0) {
        // Snooze for 1 hour
        await snoozePriceAlert(alert.id, 60);
        console.log('[AlertMonitor] Alert snoozed for 1 hour');
      } else if (buttonIndex === 1) {
        // Dismiss
        await dismissPriceAlert(alert.id);
        console.log('[AlertMonitor] Alert dismissed');
      }

      // Clear the notification
      chrome.notifications.clear(notificationId);
    } catch (error) {
      console.error('[AlertMonitor] Error handling notification button click:', error);
    }
  });

  // Handle notification clicks (open popup or alerts page)
  chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('[AlertMonitor] Notification clicked:', notificationId);
    // Clear the notification when clicked
    chrome.notifications.clear(notificationId);
  });

  console.log('[AlertMonitor] Notification handlers set up');
}

/**
 * Get unique token IDs from active alerts
 */
export async function getAlertTokenIds(): Promise<string[]> {
  try {
    const alerts = await getActivePriceAlerts();
    const tokenIds = [...new Set(alerts.map(a => a.tokenId))];
    return tokenIds;
  } catch (error) {
    console.error('[AlertMonitor] Error getting alert token IDs:', error);
    return [];
  }
}
