/**
 * Trading Session Management
 *
 * Adapted from /utils/session.ts to use chrome.storage instead of localStorage
 */

import { storageAdapter } from './storage-adapter';

export interface TradingSession {
  eoaAddress: string;
  proxyAddress: string;
  isProxyDeployed: boolean;
  hasApiCredentials: boolean;
  hasApprovals: boolean;
  apiCredentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
  lastChecked: number;
}

export type SessionStep =
  | 'idle'
  | 'checking'
  | 'credentials'
  | 'approvals'
  | 'complete';

/**
 * Get session storage key for an address
 */
function getSessionKey(address: string): string {
  return `polymarket_trading_session_${address.toLowerCase()}`;
}

/**
 * Save trading session to storage
 */
export const saveSession = async (
  address: string,
  session: TradingSession
): Promise<void> => {
  const key = getSessionKey(address);
  await storageAdapter.set(key, session);
};

/**
 * Load trading session from storage
 */
export const loadSession = async (
  address: string
): Promise<TradingSession | null> => {
  const key = getSessionKey(address);
  return await storageAdapter.get<TradingSession>(key);
};

/**
 * Clear trading session from storage
 */
export const clearSession = async (address: string): Promise<void> => {
  const key = getSessionKey(address);
  await storageAdapter.remove(key);
};

/**
 * Check if a session exists for an address
 */
export const hasSession = async (address: string): Promise<boolean> => {
  const session = await loadSession(address);
  return session !== null;
};

/**
 * Update specific fields in a session
 */
export const updateSession = async (
  address: string,
  updates: Partial<TradingSession>
): Promise<void> => {
  const existing = await loadSession(address);
  if (!existing) {
    throw new Error('No session found to update');
  }

  const updated: TradingSession = {
    ...existing,
    ...updates,
    lastChecked: Date.now(),
  };

  await saveSession(address, updated);
};

/**
 * Check if session is still valid (not expired)
 * Sessions expire after 24 hours
 */
export const isSessionValid = (session: TradingSession): boolean => {
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const age = Date.now() - session.lastChecked;
  return age < MAX_AGE;
};

/**
 * Get all saved sessions (for multi-wallet support)
 */
export const getAllSessions = async (): Promise<{
  [address: string]: TradingSession;
}> => {
  const allData = await storageAdapter.getAll();
  const sessions: { [address: string]: TradingSession } = {};

  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith('polymarket_trading_session_')) {
      const address = key.replace('polymarket_trading_session_', '');
      sessions[address] = value as TradingSession;
    }
  }

  return sessions;
};

/**
 * Clear all sessions (for logout/reset)
 */
export const clearAllSessions = async (): Promise<void> => {
  const sessions = await getAllSessions();
  const keys = Object.keys(sessions).map((addr) => getSessionKey(addr));

  for (const key of keys) {
    await storageAdapter.remove(key);
  }
};
