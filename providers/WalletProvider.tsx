"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface WalletContextType {
  privateKey: string | undefined;
  setPrivateKey: (pk: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [privateKey, setPrivateKey] = useState<string>("");

  return (
    <WalletContext.Provider value={{ privateKey, setPrivateKey }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within WalletProvider");
  }
  return context;
}
