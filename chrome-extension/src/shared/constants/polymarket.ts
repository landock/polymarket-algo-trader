/**
 * Polymarket API Constants
 *
 * Adapted from /constants/polymarket.ts for Chrome extension
 */

export const CLOB_API_URL = 'https://clob.polymarket.com';

export const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

export const DATA_API_URL = 'https://data-api.polymarket.com';

export const POLYMARKET_PROFILE_URL = (address: string) =>
  `https://polymarket.com/${address}`;

// Polygon RPC URL - can be configured in options page
export const DEFAULT_POLYGON_RPC_URL = 'https://polygon-rpc.com';

export const POLYGON_CHAIN_ID = 137;

export const SESSION_STORAGE_KEY = 'polymarket_trading_session';

// Validation constants
export const MIN_ORDER_SIZE = 0.01;
export const MIN_PRICE_CENTS = 1;
export const MAX_PRICE_CENTS = 99;
export const DUST_THRESHOLD = 0.01;

// Market monitor intervals (in milliseconds)
export const MARKET_MONITOR_INTERVAL = 5000; // 5 seconds
export const ORDER_REFRESH_INTERVAL = 3000; // 3 seconds
export const BALANCE_REFRESH_INTERVAL = 10000; // 10 seconds

// Session expiration
export const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
