import { getRiskSettings, getTodayLossTracking, resetRiskSettings, updateRiskSettings } from '../../storage/risk-settings';

export async function handleGetRiskSettings() {
  try {
    console.log('[ServiceWorker] Getting risk settings');

    const settings = await getRiskSettings();

    return { success: true, data: settings };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get risk settings:', error);
    throw error;
  }
}

export async function handleUpdateRiskSettings(payload: any) {
  try {
    console.log('[ServiceWorker] Updating risk settings:', payload);

    const updated = await updateRiskSettings(payload);

    return { success: true, data: updated };
  } catch (error) {
    console.error('[ServiceWorker] Failed to update risk settings:', error);
    throw error;
  }
}

export async function handleResetRiskSettings() {
  try {
    console.log('[ServiceWorker] Resetting risk settings to defaults');

    const defaults = await resetRiskSettings();

    return { success: true, data: defaults };
  } catch (error) {
    console.error('[ServiceWorker] Failed to reset risk settings:', error);
    throw error;
  }
}

export async function handleGetDailyLoss() {
  try {
    console.log('[ServiceWorker] Getting daily loss tracking');

    const tracking = await getTodayLossTracking();

    return { success: true, data: tracking };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get daily loss tracking:', error);
    throw error;
  }
}
