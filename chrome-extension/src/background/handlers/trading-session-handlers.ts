import { getE2EOverrides } from './e2e-overrides';

export async function handleInitializeTradingSession(privateKey: string, proxyAddress?: string) {
  try {
    const overrides = await getE2EOverrides();
    if (overrides?.walletAddresses) {
      console.log('[ServiceWorker] Using e2e wallet override');
      return { success: true };
    }

    const { initializeTradingSession } = await import('../trading-session');
    await initializeTradingSession(privateKey, proxyAddress);
    console.log('[ServiceWorker] Trading session initialized');
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to initialize trading session:', error);
    throw error;
  }
}

export async function handleClearTradingSession() {
  try {
    const { clearTradingSession } = await import('../trading-session');
    clearTradingSession();
    console.log('[ServiceWorker] Trading session cleared');
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Failed to clear trading session:', error);
    throw error;
  }
}

export async function handleGetWalletAddresses() {
  try {
    const overrides = await getE2EOverrides();
    if (overrides?.walletAddresses) {
      return { success: true, data: overrides.walletAddresses };
    }

    const { getWalletAddresses } = await import('../trading-session');
    const addresses = getWalletAddresses();

    if (!addresses) {
      return { success: false, error: 'No active trading session' };
    }

    console.log('[ServiceWorker] Wallet addresses:', addresses);
    return { success: true, data: addresses };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get wallet addresses:', error);
    throw error;
  }
}
