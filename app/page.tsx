"use client";

import useClobClient from "../hooks/useClobClient";
import useProxyWallet from "../hooks/useProxyWallet";
import useTradingSession from "../hooks/useTradingSession";
import { useWallet } from "../providers/WalletProvider";
import TradingClientProvider from "../providers/TradingClientProvider";

import Header from "../components/Header";
import PolygonAssets from "../components/PolygonAssets";
import TradingSession from "../components/TradingSession";
import MarketTabs from "../components/Trading/MarketTabs";

export default function Home() {
  const { wallet, isConnected, eoaAddress } = useWallet();
  const { proxyAddress } = useProxyWallet(eoaAddress);

  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
    relayClient,
  } = useTradingSession();

  const { clobClient } = useClobClient(
    wallet,
    tradingSession,
    isTradingSessionComplete
  );

  return (
    <div className="p-6 min-h-screen flex flex-col gap-6 max-w-7xl mx-auto">
      <Header
        isConnected={isConnected}
        eoaAddress={eoaAddress}
        proxyAddress={proxyAddress}
      />

      {isConnected && eoaAddress && proxyAddress && (
        <>
          <TradingSession
            session={tradingSession}
            currentStep={currentStep}
            error={sessionError}
            isComplete={isTradingSessionComplete}
            initialize={initializeTradingSession}
            endSession={endTradingSession}
          />

          <PolygonAssets proxyAddress={proxyAddress} />

          {isTradingSessionComplete && (
            <TradingClientProvider
              clobClient={clobClient}
              eoaAddress={eoaAddress}
              proxyAddress={proxyAddress}
              relayClient={relayClient}
            >
              <MarketTabs />
            </TradingClientProvider>
          )}
        </>
      )}
    </div>
  );
}
