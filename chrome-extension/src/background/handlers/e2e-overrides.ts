import type { PolymarketPosition } from '../../shared/types/positions';

interface E2EOverrides {
  walletAddresses?: { eoaAddress: string; proxyAddress: string };
  positions?: PolymarketPosition[];
  positionsError?: string;
  clobOrders?: any[];
  clobOrdersError?: string;
}

export async function getE2EOverrides(): Promise<E2EOverrides | null> {
  try {
    const result = await chrome.storage.local.get('e2e_overrides');
    return result.e2e_overrides || null;
  } catch (error) {
    console.error('[ServiceWorker] Failed to load e2e overrides:', error);
    return null;
  }
}
