import { useState, useCallback, useEffect } from "react";

import useRelayClient from "./useRelayClient";
import useProxyWallet from "./useProxyWallet";
import useWalletFromPK from "./useWalletFromPK";
import useUserApiCredentials from "./useUserApiCredentials";

import {
  saveSession,
  clearSession,
  TradingSession,
  SessionStep,
} from "../utils/session";

// This is the coordination hook that manages the user's trading session
// It orchestrates the steps for initializing the CLOB client
// It creates, stores, and loads the user's L2 credentials for the trading session (API credentials)

export default function useTradingSession() {
  const [currentStep, setCurrentStep] = useState<SessionStep>("idle");
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null
  );

  const { wallet, eoaAddress } = useWalletFromPK();
  const { proxyAddress, isProxyDeployed } = useProxyWallet(eoaAddress);
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { relayClient } = useRelayClient(eoaAddress);

  useEffect(() => {
    return () => {
      if (eoaAddress) {
        endTradingSession();
      }
    };
  }, []);

  // The core function that orchestrates the trading session initialization
  const initializeTradingSession = useCallback(async () => {
    if (!eoaAddress || !wallet || !proxyAddress) {
      throw new Error("Wallet not connected or proxy address missing");
    }

    setCurrentStep("checking");
    setSessionError(null);

    try {
      const sternWarning =
        `There is no Magic Link custom proxy deployed for this EOA: ${eoaAddress}. ` +
        `This indicates that this user has never logged into, or placed trades on 'polymarket.com' with the same email used to export the private key from 'reveal.magic.link/polymarket.' ` +
        `This flow should only be reserved for users who have history on 'polymarket.com' by way of logging in with said email address and placing at least one trade.`;

      // Step 1: Check if custom proxy wallet is already deployed
      setCurrentStep("checking");
      let isDeployed = false;
      isDeployed = await isProxyDeployed();
      if (!isDeployed) {
        throw new Error(sternWarning);
      }

      // Step 2: Get User API Credentials (derive or create)
      // and store them in the custom session object
      setCurrentStep("credentials");
      const apiCreds = await createOrDeriveUserApiCredentials(wallet);

      // Step 3: Create custom session object
      const newSession: TradingSession = {
        eoaAddress: eoaAddress,
        proxyAddress: proxyAddress,
        isProxyDeployed: true,
        hasApiCredentials: true,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);

      setCurrentStep("complete");
    } catch (err) {
      console.error("Session initialization error:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      setSessionError(error);
      setCurrentStep("idle");
    }
  }, [
    eoaAddress,
    wallet,
    proxyAddress,
    isProxyDeployed,
    createOrDeriveUserApiCredentials,
  ]);

  // This function clears the trading session and resets the state
  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return;

    clearSession(eoaAddress);
    setTradingSession(null);
    setCurrentStep("idle");
    setSessionError(null);
  }, [eoaAddress]);

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete:
      tradingSession?.isProxyDeployed && tradingSession?.hasApiCredentials,
    initializeTradingSession,
    endTradingSession,
    relayClient,
  };
}
