/**
 * Risk Management Settings Storage Service
 *
 * Manages persistent storage of risk management settings in chrome.storage.local
 */

import { storageAdapter } from './storage-adapter';
import type { RiskSettings, DailyLossTracking } from '../shared/types';

const RISK_SETTINGS_KEY = 'risk_settings';

/**
 * Default risk settings
 */
export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxPositionSizePerMarket: 1000, // $1000 default
  maxDailyLoss: 500, // $500 default
  maxTotalExposure: 5000, // $5000 default
  enableRiskChecks: true,
  updatedAt: Date.now()
};

/**
 * Get risk settings
 */
export async function getRiskSettings(): Promise<RiskSettings> {
  const settings = await storageAdapter.get<RiskSettings>(RISK_SETTINGS_KEY);
  return settings || DEFAULT_RISK_SETTINGS;
}

/**
 * Update risk settings
 */
export async function updateRiskSettings(settings: Partial<RiskSettings>): Promise<RiskSettings> {
  const current = await getRiskSettings();
  const updated: RiskSettings = {
    ...current,
    ...settings,
    updatedAt: Date.now()
  };
  await storageAdapter.set(RISK_SETTINGS_KEY, updated);
  return updated;
}

/**
 * Reset risk settings to defaults
 */
export async function resetRiskSettings(): Promise<RiskSettings> {
  const defaults = { ...DEFAULT_RISK_SETTINGS, updatedAt: Date.now() };
  await storageAdapter.set(RISK_SETTINGS_KEY, defaults);
  return defaults;
}

/**
 * Daily Loss Tracking
 */
const DAILY_LOSS_KEY = 'daily_loss_tracking';

/**
 * Get today's loss tracking
 */
export async function getTodayLossTracking(): Promise<DailyLossTracking> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const tracking = await storageAdapter.get<DailyLossTracking>(DAILY_LOSS_KEY);

  // If tracking is for a different day, reset it
  if (!tracking || tracking.date !== today) {
    return {
      date: today,
      totalLoss: 0,
      trades: []
    };
  }

  return tracking;
}

/**
 * Record a trade for daily loss tracking
 */
export async function recordTrade(pnl: number, orderId: string): Promise<void> {
  const tracking = await getTodayLossTracking();

  tracking.trades.push({
    timestamp: Date.now(),
    pnl,
    orderId
  });

  // Update total loss (only count losses, not gains)
  if (pnl > 0) {
    tracking.totalLoss += pnl;
  }

  await storageAdapter.set(DAILY_LOSS_KEY, tracking);
}

/**
 * Get current daily loss
 */
export async function getCurrentDailyLoss(): Promise<number> {
  const tracking = await getTodayLossTracking();
  return tracking.totalLoss;
}
