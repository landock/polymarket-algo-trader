"use client";
import { Wallet, providers } from "ethers";
import { createPublicClient, http, PublicClient } from "viem";
import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { POLYGON_RPC_URL } from "@/constants/polymarket";
import { polygon } from "viem/chains";

interface WalletContextType {
  privateKey: string;
  setPrivateKey: (pk: string) => void;
  wallet: Wallet | null;
  eoaAddress: string | undefined;
  isConnected: boolean;
  publicClient: PublicClient;
}

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
});

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [privateKey, setPrivateKey] = useState<string>("");

  const { wallet, eoaAddress } = useMemo(() => {
    if (!privateKey || !privateKey.startsWith("0x")) {
      return { wallet: null, eoaAddress: undefined };
    }

    try {
      const provider = new providers.JsonRpcProvider(POLYGON_RPC_URL);
      const wallet = new Wallet(privateKey, provider);
      return { wallet, eoaAddress: wallet.address };
    } catch (error) {
      console.error("Invalid private key", error);
      return { wallet: null, eoaAddress: undefined };
    }
  }, [privateKey]);

  const value = useMemo<WalletContextType>(
    () => ({
      privateKey,
      setPrivateKey,
      wallet,
      eoaAddress,
      isConnected: wallet !== null,
      publicClient,
    }),
    [privateKey, wallet, eoaAddress]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// Single hook to access wallet - replaces useWalletFromPK
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
