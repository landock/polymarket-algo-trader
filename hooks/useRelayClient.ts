import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";

import {
  RELAYER_URL,
  POLYGON_CHAIN_ID,
  REMOTE_SIGNING_URL,
} from "@/constants/polymarket";

// This hook is responsible for creating and managing the relay client instance
// The user's signer and builder config are used to initialize the relay client

export default function useRelayClient() {
  const [relayClient, setRelayClient] = useState<RelayClient | null>(null);
  const { wallet, eoaAddress } = useWallet();

  // This function initializes the relay client with
  // the user's signer and builder config
  const initializeRelayClient = useCallback(async () => {
    if (!eoaAddress || !wallet) {
      throw new Error("Wallet not connected");
    }

    try {
      // Builder config is obtained from 'polymarket.com/settings?tab=builder'
      // A remote signing server is used to enable remote signing for builder authentication
      // This allows the builder credentials to be kept secure while signing requests

      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: REMOTE_SIGNING_URL(),
        },
      });

      // The relayClient instance is used for setting token approvals
      // and executing CTF operations such as splitting, merging, and
      // redeeming positions. Uses PROXY wallet type for Magic Link users.

      const client = new RelayClient(
        RELAYER_URL,
        POLYGON_CHAIN_ID,
        wallet,
        builderConfig,
        RelayerTxType.PROXY
      );

      setRelayClient(client);
      return client;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to initialize relay client");
      throw error;
    }
  }, [eoaAddress, wallet]);

  // This function clears the relay client and resets the state
  const clearRelayClient = useCallback(() => {
    setRelayClient(null);
  }, []);

  return {
    relayClient,
    initializeRelayClient,
    clearRelayClient,
  };
}
