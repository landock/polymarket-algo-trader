/**
 * Background Service Worker
 *
 * Handles 24/7 market monitoring and algorithmic order execution
 */

// Polyfill Buffer for service worker (needed by ethers.js and CLOB client)
import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;

import { ensureMarketMonitor, setupMarketMonitor } from './market-monitor';
import { tickAlgoEngine } from './algo-engine';
import { testServiceWorkerDependencies } from './dependency-test';
import { checkPriceAlerts, setupNotificationHandlers } from './alert-monitor';
import type { ExtensionMessage, MessageResponse } from '../shared/types';
import { dispatchMessage } from './message-handlers';

// Service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Polymarket Algo Trader installed', details.reason);

  // Set up market monitoring (every 10 seconds)
  setupMarketMonitor(10);

  // Set up notification handlers for price alerts
  setupNotificationHandlers();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[ServiceWorker] Startup detected, ensuring alarms');
  ensureMarketMonitor(10);
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'market-monitor') {
    console.log('[ServiceWorker] Market monitor tick');
    await tickAlgoEngine();
    // Also check price alerts on each monitor tick
    await checkPriceAlerts();
  }
});

// Handle messages from content script/popup
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse: (response: MessageResponse) => void) => {
  console.log('Received message:', message);

  // Wrap async operations in an immediately invoked async function
  (async () => {
    try {
      const result = await dispatchMessage(message);

      try {
        sendResponse(result);
      } catch (sendError) {
        console.error('[ServiceWorker] Failed to send response (channel may be closed):', sendError);
      }
    } catch (error: any) {
      console.error('[ServiceWorker] Message handler error:', error);
      try {
        sendResponse({
          success: false,
          error: error?.message || String(error) || 'Unknown error'
        });
      } catch (sendError) {
        console.error('[ServiceWorker] Failed to send error response (channel may be closed):', sendError);
      }
    }
  })();

  return true; // Keep message channel open for async response
});

// Graceful shutdown
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending - saving state');
  // TODO: Save any in-memory state before shutdown
});

// Log that service worker is active
console.log('Polymarket Algo Trader service worker active');

ensureMarketMonitor(10).catch((error) => {
  console.error('[ServiceWorker] Failed to ensure market monitor alarm:', error);
});

// Run dependency test on startup (dev-only)
if (__DEV__) {
  setTimeout(() => {
    console.log('\n🔍 Running automatic dependency check...\n');
    testServiceWorkerDependencies().catch(err => {
      console.error('Dependency test failed:', err);
    });
  }, 1000); // Delay 1 second to let other modules load
}
