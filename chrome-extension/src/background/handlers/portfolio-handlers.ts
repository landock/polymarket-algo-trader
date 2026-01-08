import { fetchPortfolioMetrics } from '../portfolio-service';
import { fetchPositions } from '../positions-fetcher';
export async function handleGetPortfolio(proxyAddress?: string) {
  try {
    const { getWalletAddresses } = await import('../trading-session');
    const addresses = proxyAddress ? { proxyAddress } : getWalletAddresses();

    if (!addresses?.proxyAddress) {
      return {
        success: false,
        error: 'No wallet address available. Please unlock your wallet first.'
      };
    }

    console.log('[ServiceWorker] Fetching portfolio metrics for', addresses.proxyAddress);

    const positions = await fetchPositions(addresses.proxyAddress);
    console.log(`[ServiceWorker] Fetched ${positions.length} positions`);

    const portfolio = await fetchPortfolioMetrics(positions);
    console.log('[ServiceWorker] Portfolio metrics calculated:', portfolio.metrics);

    return {
      success: true,
      data: portfolio
    };
  } catch (error: any) {
    console.error('[ServiceWorker] Failed to fetch portfolio:', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch portfolio metrics'
    };
  }
}
