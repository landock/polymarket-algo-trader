/**
 * Trading Provider
 *
 * Migrated from /providers/TradingProvider.tsx
 * Aggregates trading-related state and functionality
 *
 * Key changes from original:
 * - All storage operations are now async (chrome.storage)
 */

import { createContext, useContext, ReactNode } from 'react';
import { useWallet } from './WalletProvider';
import useClobClient from '../hooks/useClobClient';
import useProxyWallet from '../hooks/useProxyWallet';
import useTradingSession from '../hooks/useTradingSession';
import type { ClobClient } from '@polymarket/clob-client';
import { TradingSession, SessionStep } from '../../storage/session';

interface TradingContextType {
  tradingSession: TradingSession | null;
  currentStep: SessionStep;
  sessionError: Error | null;
  isTradingSessionComplete: boolean | undefined;
  initializeTradingSession: () => Promise<void>;
  endTradingSession: () => Promise<void>;
  clobClient: ClobClient | null;
  eoaAddress: string | undefined;
  proxyAddress: string | null;
  isConnected: boolean;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
  return ctx;
}

export default function TradingProvider({ children }: { children: ReactNode }) {
  const { wallet, eoaAddress, isConnected } = useWallet();
  const { proxyAddress } = useProxyWallet();

  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
  } = useTradingSession();

  const { clobClient } = useClobClient(
    wallet,
    tradingSession,
    isTradingSessionComplete
  );

  return (
    <TradingContext.Provider
      value={{
        tradingSession,
        currentStep,
        sessionError,
        isTradingSessionComplete,
        initializeTradingSession,
        endTradingSession,
        clobClient,
        eoaAddress,
        proxyAddress,
        isConnected,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
