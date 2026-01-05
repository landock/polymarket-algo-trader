/**
 * useTradingSession Hook
 *
 * Migrated from /hooks/useTradingSession.ts
 * Orchestrates the trading session initialization process
 *
 * Key changes from original:
 * - saveSession and clearSession are now async (chrome.storage)
 */

import { useState, useCallback, useEffect } from 'react';

import useProxyWallet from './useProxyWallet';
import useUserApiCredentials from './useUserApiCredentials';
import { useWallet } from '../providers/WalletProvider';

import {
  saveSession,
  clearSession,
  TradingSession,
  SessionStep,
} from '../../storage/session';

/**
 * This is the coordination hook that manages the user's trading session.
 * It orchestrates the steps for initializing the CLOB client.
 * It creates, stores, and loads the user's L2 credentials for the trading session (API credentials).
 */
export default function useTradingSession() {
  const [currentStep, setCurrentStep] = useState<SessionStep>('idle');
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null
  );

  const { wallet, eoaAddress } = useWallet();
  const { proxyAddress } = useProxyWallet();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();

  useEffect(() => {
    return () => {
      if (eoaAddress) {
        endTradingSession();
      }
    };
  }, []);

  /**
   * The core function that orchestrates the trading session initialization
   */
  const initializeTradingSession = useCallback(async () => {
    if (!eoaAddress || !wallet || !proxyAddress) {
      throw new Error('Wallet not connected or proxy address missing');
    }

    setCurrentStep('idle');
    setSessionError(null);

    try {
      // Step 1: Create or derive user API credentials
      setCurrentStep('credentials');
      const apiCreds = await createOrDeriveUserApiCredentials(wallet);

      // Step 2: Create a custom session object
      const newSession: TradingSession = {
        eoaAddress: eoaAddress,
        proxyAddress: proxyAddress,
        isProxyDeployed: true,
        hasApprovals: true,
        hasApiCredentials: true,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);

      // Save session to chrome.storage (async)
      await saveSession(eoaAddress, newSession);

      setCurrentStep('complete');
    } catch (err) {
      console.error('Session initialization error:', err);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setSessionError(error);
      setCurrentStep('idle');
    }
  }, [eoaAddress, wallet, proxyAddress, createOrDeriveUserApiCredentials]);

  /**
   * Clear the trading session and reset state
   */
  const endTradingSession = useCallback(async () => {
    if (!eoaAddress) return;

    // Clear session from chrome.storage (async)
    await clearSession(eoaAddress);
    setTradingSession(null);
    setCurrentStep('idle');
    setSessionError(null);
  }, [eoaAddress]);

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete:
      tradingSession?.isProxyDeployed &&
      tradingSession?.hasApiCredentials &&
      tradingSession?.hasApprovals,
    initializeTradingSession,
    endTradingSession,
  };
}
