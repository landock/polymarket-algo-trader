/**
 * Position Fetcher Module
 *
 * Fetches and caches user positions from Polymarket Data API
 * Implements caching strategy to minimize API calls and improve performance
 */

import type { PolymarketPosition, PositionsCache } from '../shared/types/positions';

// API Configuration
const POLYMARKET_DATA_API = 'https://data-api.polymarket.com';
const POSITIONS_CACHE_KEY = 'positions_cache';
const CACHE_TTL_MS = 5000; // 5 seconds
const SIZE_THRESHOLD = 0.10; // Filter positions < $0.10

/**
 * Fetch user positions from Polymarket Data API
 * Uses caching to minimize API calls
 */
export async function fetchPositions(proxyAddress: string): Promise<PolymarketPosition[]> {
  console.log('[PositionsFetcher] Fetching positions for', proxyAddress);

  // Check cache first
  const cached = await getCachedPositions(proxyAddress);
  if (cached) {
    console.log('[PositionsFetcher] Returning cached positions:', cached.length);
    return cached;
  }

  // Fetch from API
  try {
    const url = `${POLYMARKET_DATA_API}/positions?user=${proxyAddress}&sizeThreshold=${SIZE_THRESHOLD}&limit=500`;
    console.log('[PositionsFetcher] Fetching from API:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const positions: PolymarketPosition[] = await response.json();
    console.log('[PositionsFetcher] Fetched', positions.length, 'positions from API');

    // Additional client-side filtering (belt and suspenders approach)
    const filtered = positions.filter(p => p.currentValue >= SIZE_THRESHOLD);

    if (filtered.length < positions.length) {
      console.log('[PositionsFetcher] Filtered out', positions.length - filtered.length, 'small positions');
    }

    // Cache the results
    await cachePositions(proxyAddress, filtered);

    return filtered;
  } catch (error) {
    console.error('[PositionsFetcher] Failed to fetch positions:', error);

    // Try to return stale cached data as fallback
    const staleCache = await getStaleCache(proxyAddress);
    if (staleCache) {
      console.warn('[PositionsFetcher] Returning stale cached data');
      return staleCache;
    }

    throw error;
  }
}

/**
 * Get cached positions if still valid
 */
async function getCachedPositions(proxyAddress: string): Promise<PolymarketPosition[] | null> {
  try {
    const result = await chrome.storage.local.get(POSITIONS_CACHE_KEY);
    const cache: PositionsCache | undefined = result[POSITIONS_CACHE_KEY];

    if (!cache) {
      console.log('[PositionsFetcher] No cache found');
      return null;
    }

    if (cache.proxyAddress !== proxyAddress) {
      console.log('[PositionsFetcher] Cache is for different address');
      return null;
    }

    const age = Date.now() - cache.timestamp;
    if (age > CACHE_TTL_MS) {
      console.log('[PositionsFetcher] Cache expired (age:', Math.round(age / 1000), 's)');
      return null;
    }

    console.log('[PositionsFetcher] Cache hit (age:', Math.round(age / 1000), 's)');
    return cache.data;
  } catch (error) {
    console.error('[PositionsFetcher] Error reading cache:', error);
    return null;
  }
}

/**
 * Get stale cache as fallback when API fails
 */
async function getStaleCache(proxyAddress: string): Promise<PolymarketPosition[] | null> {
  try {
    const result = await chrome.storage.local.get(POSITIONS_CACHE_KEY);
    const cache: PositionsCache | undefined = result[POSITIONS_CACHE_KEY];

    if (!cache || cache.proxyAddress !== proxyAddress) {
      return null;
    }

    const age = Date.now() - cache.timestamp;
    console.log('[PositionsFetcher] Using stale cache (age:', Math.round(age / 1000), 's)');
    return cache.data;
  } catch (error) {
    console.error('[PositionsFetcher] Error reading stale cache:', error);
    return null;
  }
}

/**
 * Cache positions with timestamp
 */
async function cachePositions(proxyAddress: string, positions: PolymarketPosition[]): Promise<void> {
  try {
    const cache: PositionsCache = {
      data: positions,
      timestamp: Date.now(),
      proxyAddress
    };

    await chrome.storage.local.set({ [POSITIONS_CACHE_KEY]: cache });
    console.log('[PositionsFetcher] Cached', positions.length, 'positions');
  } catch (error) {
    console.error('[PositionsFetcher] Error caching positions:', error);
  }
}

/**
 * Clear the positions cache
 * Call this after actions that modify positions (sell, redeem)
 */
export async function clearPositionsCache(): Promise<void> {
  try {
    await chrome.storage.local.remove(POSITIONS_CACHE_KEY);
    console.log('[PositionsFetcher] Cache cleared');
  } catch (error) {
    console.error('[PositionsFetcher] Error clearing cache:', error);
  }
}

/**
 * Force refresh positions (bypass cache)
 */
export async function refreshPositions(proxyAddress: string): Promise<PolymarketPosition[]> {
  console.log('[PositionsFetcher] Force refresh requested');
  await clearPositionsCache();
  return fetchPositions(proxyAddress);
}
