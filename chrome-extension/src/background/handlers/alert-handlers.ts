import { createPriceAlert, deletePriceAlert, dismissPriceAlert, getAlertHistory, getPriceAlerts, snoozePriceAlert, updatePriceAlert } from '../../storage/price-alerts';

export async function handleGetPriceAlerts() {
  try {
    const alerts = await getPriceAlerts();
    console.log('[ServiceWorker] Retrieved', alerts.length, 'price alerts');
    return { success: true, data: alerts };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get price alerts:', error);
    throw error;
  }
}

export async function handleCreatePriceAlert(alertData: any) {
  try {
    const alert = await createPriceAlert(
      alertData.tokenId,
      alertData.condition,
      alertData.targetPrice,
      alertData.marketQuestion,
      alertData.outcome
    );
    console.log('[ServiceWorker] Created price alert:', alert.id);
    return { success: true, data: alert };
  } catch (error) {
    console.error('[ServiceWorker] Failed to create price alert:', error);
    throw error;
  }
}

export async function handleUpdatePriceAlert(alertId: string, updates: any) {
  try {
    await updatePriceAlert(alertId, updates);
    console.log('[ServiceWorker] Updated price alert:', alertId);
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to update price alert:', error);
    throw error;
  }
}

export async function handleDeletePriceAlert(alertId: string) {
  try {
    await deletePriceAlert(alertId);
    console.log('[ServiceWorker] Deleted price alert:', alertId);
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to delete price alert:', error);
    throw error;
  }
}

export async function handleSnoozePriceAlert(alertId: string, durationMinutes?: number) {
  try {
    await snoozePriceAlert(alertId, durationMinutes);
    console.log('[ServiceWorker] Snoozed price alert:', alertId);
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to snooze price alert:', error);
    throw error;
  }
}

export async function handleDismissPriceAlert(alertId: string) {
  try {
    await dismissPriceAlert(alertId);
    console.log('[ServiceWorker] Dismissed price alert:', alertId);
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to dismiss price alert:', error);
    throw error;
  }
}

export async function handleGetAlertHistory() {
  try {
    const history = await getAlertHistory();
    console.log('[ServiceWorker] Retrieved', history.length, 'alert history entries');
    return { success: true, data: history };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get alert history:', error);
    throw error;
  }
}
