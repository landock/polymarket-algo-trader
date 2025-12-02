import { useMemo } from "react";
import { Wallet, providers } from "ethers";
import { useWalletContext } from "@/providers/WalletProvider";
import { POLYGON_RPC_URL } from "../constants/polymarket";

/*
  For simplicity's sake, this hook creates a wallet from a PK obtained
  from the user who logged in with Magic email/Google on Polymarket.com 
  and exported their PK from "reveal.magic.link/polymarket".
  
  This is not the recommended way to handle, store, and use the user's
  private key!
*/

export default function useWalletFromPK() {
  const { privateKey } = useWalletContext();

  const { wallet, eoaAddress } = useMemo(() => {
    if (!privateKey || !privateKey.startsWith("0x")) {
      return { wallet: null, eoaAddress: undefined };
    }

    try {
      const provider = new providers.JsonRpcProvider(POLYGON_RPC_URL);
      const wallet = new Wallet(privateKey, provider);

      return {
        wallet,
        eoaAddress: wallet.address,
      };
    } catch (error) {
      console.error("Invalid private key", error);
      return { wallet: null, eoaAddress: undefined };
    }
  }, [privateKey]);

  return {
    wallet,
    isConnected: wallet !== null,
    eoaAddress,
  };
}
