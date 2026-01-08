/**
 * Market Price Monitor
 *
 * Fetches current market prices from Polymarket CLOB API
 * Used by algo engine to evaluate order conditions
 */

import { CLOB_API_URL } from '../shared/constants/polymarket';
import { getAlgoOrders } from '../storage/algo-orders';
import { getActiveTradingSession } from './trading-session';
import { Side } from '@polymarket/clob-client';

export interface MarketPrice {
  tokenId: string;
  price: number; // Last traded price
  bestBid: number;
  bestAsk: number;
  timestamp: number;
}

/**
 * Fetch current price for a single token
 */
export async function fetchTokenPrice(tokenId: string): Promise<MarketPrice | null> {
  try {
    // Fetch orderbook from CLOB API
    const response = await fetch(`${CLOB_API_URL}/book?token_id=${tokenId}`);

    if (!response.ok) {
      console.error(`Failed to fetch price for ${tokenId}:`, response.status);
      return null;
    }

    const data = await response.json();

    // Extract best bid and ask from orderbook
    const bids = data.bids || [];
    const asks = data.asks || [];

    const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
    const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0;

    // Use mid-price as current price
    const price = (bestBid + bestAsk) / 2;

    console.log(`[MarketMonitor] 💰 Token ${tokenId.slice(0, 12)}...`);
    console.log(`[MarketMonitor]    Bid: $${bestBid.toFixed(4)} | Ask: $${bestAsk.toFixed(4)} | Mid: $${price.toFixed(4)}`);

    return {
      tokenId,
      price,
      bestBid,
      bestAsk,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error fetching price for ${tokenId}:`, error);
    return null;
  }
}

/**
 * Fetch prices for multiple tokens using batch API
 */
export async function fetchTokenPrices(tokenIds: string[]): Promise<Map<string, MarketPrice>> {
  const priceMap = new Map<string, MarketPrice>();

  if (tokenIds.length === 0) {
    return priceMap;
  }

  try {
    // Try to use authenticated CLOB client for batch fetching
    const session = getActiveTradingSession();

    if (session?.clobClient) {
      console.log(`[MarketMonitor] Fetching prices for ${tokenIds.length} tokens using batch API`);

      // Fetch all prices in parallel using batch methods
      const promises = tokenIds.map(async (tokenId) => {
        try {
          const [buyPriceRes, sellPriceRes, midpointRes] = await Promise.all([
            session.clobClient!.getPrice(tokenId, Side.BUY),
            session.clobClient!.getPrice(tokenId, Side.SELL),
            session.clobClient!.getMidpoint(tokenId)
          ]);

          const bestAsk = parseFloat(buyPriceRes.price || '0');
          const bestBid = parseFloat(sellPriceRes.price || '0');
          const price = parseFloat(midpointRes.mid || '0');

          return {
            tokenId,
            price: price > 0 ? price : (bestBid + bestAsk) / 2,
            bestBid,
            bestAsk,
            timestamp: Date.now()
          };
        } catch (error) {
          console.error(`[MarketMonitor] Failed to fetch price for ${tokenId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);

      // Build map of successful fetches
      results.forEach((price) => {
        if (price && price.price > 0) {
          priceMap.set(price.tokenId, price);
          console.log(
            `[MarketMonitor] 💰 ${price.tokenId.slice(0, 12)}... ` +
            `Bid: $${price.bestBid.toFixed(4)} | Ask: $${price.bestAsk.toFixed(4)} | Mid: $${price.price.toFixed(4)}`
          );
        }
      });

      return priceMap;
    }

    // Fallback to individual fetches if no session
    console.log(`[MarketMonitor] No active session, falling back to REST API`);
    const promises = tokenIds.map(tokenId => fetchTokenPrice(tokenId));
    const results = await Promise.all(promises);

    results.forEach((price) => {
      if (price) {
        priceMap.set(price.tokenId, price);
      }
    });

    return priceMap;
  } catch (error) {
    console.error('[MarketMonitor] Error in batch fetch:', error);
    return priceMap;
  }
}

/**
 * Get unique token IDs from active orders
 */
export async function getActiveTokenIds(): Promise<string[]> {
  try {
    const orders = await getAlgoOrders();

    // Filter active and paused orders
    const activeOrders = orders.filter((o: any) =>
      o.status === 'ACTIVE' || o.status === 'PAUSED'
    );

    // Extract unique token IDs
    const tokenIds = [...new Set(activeOrders.map((o: any) => o.tokenId))] as string[];

    return tokenIds;
  } catch (error) {
    console.error('Error getting active token IDs:', error);
    return [];
  }
}

/**
 * Setup alarm for periodic market monitoring
 */
export function setupMarketMonitor(intervalSeconds: number = 5) {
  chrome.alarms.create('market-monitor', {
    periodInMinutes: intervalSeconds / 60
  });

  console.log(`Market monitor alarm set up (every ${intervalSeconds}s)`);
}

export async function ensureMarketMonitor(intervalSeconds: number = 5) {
  const alarm = await chrome.alarms.get('market-monitor');

  if (!alarm || alarm.periodInMinutes !== intervalSeconds / 60) {
    setupMarketMonitor(intervalSeconds);
  }
}
