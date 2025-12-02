"use client";

import { createContext, ReactNode } from "react";
import type { ClobClient } from "@polymarket/clob-client";
import { RelayClient } from "@polymarket/builder-relayer-client";

export interface TradingClientContextType {
  clobClient: ClobClient | null;
  eoaAddress: string | undefined;
  proxyAddress: string | null;
  relayClient: RelayClient | null;
}

export const TradingClientContext =
  createContext<TradingClientContextType | null>(null);

interface TradingClientProviderProps {
  children: ReactNode;
  clobClient: ClobClient | null;
  eoaAddress: string | undefined;
  proxyAddress: string | null;
  relayClient: RelayClient | null;
}

export default function TradingClientProvider({
  children,
  clobClient,
  eoaAddress,
  proxyAddress,
  relayClient,
}: TradingClientProviderProps) {
  return (
    <TradingClientContext.Provider
      value={{ clobClient, eoaAddress, proxyAddress, relayClient }}
    >
      {children}
    </TradingClientContext.Provider>
  );
}
