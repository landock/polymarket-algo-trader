/**
 * Risk Validation Module
 *
 * Validates orders against risk management settings before execution
 */

import { getRiskSettings, getCurrentDailyLoss } from '../storage/risk-settings';
import { fetchPositions } from './positions-fetcher';
import { getWalletAddresses } from './trading-session';

export interface RiskCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate an order against risk management settings
 */
export async function validateRiskLimits(
  tokenId: string,
  side: 'BUY' | 'SELL',
  size: number,
  price: number,
  override: boolean = false
): Promise<RiskCheckResult> {
  const result: RiskCheckResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Get risk settings
  const settings = await getRiskSettings();

  // If risk checks are disabled or override is true, skip validation
  if (!settings.enableRiskChecks || override) {
    if (override) {
      result.warnings.push('Risk checks overridden by user');
    }
    return result;
  }

  // Only check BUY orders (SELL orders reduce exposure)
  if (side === 'SELL') {
    return result;
  }

  // 1. Check max position size per market
  const orderValue = size * price;
  if (orderValue > settings.maxPositionSizePerMarket) {
    result.isValid = false;
    result.errors.push(
      `Order size ($${orderValue.toFixed(2)}) exceeds max position size per market ($${settings.maxPositionSizePerMarket.toFixed(2)})`
    );
  }

  // 2. Check daily loss limit
  try {
    const currentDailyLoss = await getCurrentDailyLoss();
    if (currentDailyLoss >= settings.maxDailyLoss) {
      result.isValid = false;
      result.errors.push(
        `Daily loss limit reached ($${currentDailyLoss.toFixed(2)} / $${settings.maxDailyLoss.toFixed(2)}). Trading suspended for today.`
      );
    } else if (currentDailyLoss > settings.maxDailyLoss * 0.8) {
      // Warning at 80% of limit
      result.warnings.push(
        `Approaching daily loss limit: $${currentDailyLoss.toFixed(2)} / $${settings.maxDailyLoss.toFixed(2)}`
      );
    }
  } catch (error) {
    console.error('[RiskValidator] Failed to check daily loss:', error);
    // Don't fail the order if we can't check daily loss
  }

  // 3. Check total portfolio exposure
  try {
    const addresses = getWalletAddresses();
    if (addresses?.proxyAddress) {
      const positions = await fetchPositions(addresses.proxyAddress);
      const totalExposure = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
      const newExposure = totalExposure + orderValue;

      if (newExposure > settings.maxTotalExposure) {
        result.isValid = false;
        result.errors.push(
          `Order would exceed max total portfolio exposure ($${newExposure.toFixed(2)} > $${settings.maxTotalExposure.toFixed(2)})`
        );
      } else if (newExposure > settings.maxTotalExposure * 0.9) {
        // Warning at 90% of limit
        result.warnings.push(
          `Approaching max portfolio exposure: $${newExposure.toFixed(2)} / $${settings.maxTotalExposure.toFixed(2)}`
        );
      }
    }
  } catch (error) {
    console.error('[RiskValidator] Failed to check portfolio exposure:', error);
    // Don't fail the order if we can't check exposure
  }

  return result;
}

/**
 * Format risk validation errors for display
 */
export function formatRiskErrors(errors: string[]): string {
  if (errors.length === 0) {
    return '';
  }

  return `Risk check failed:\n${errors.map(e => `• ${e}`).join('\n')}`;
}

/**
 * Check if risk override is allowed
 * (For future implementation of role-based overrides)
 */
export function canOverrideRisk(): boolean {
  // For now, always allow override with confirmation
  return true;
}
