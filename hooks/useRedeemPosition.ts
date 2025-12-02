import { useState, useCallback } from "react";
import type { Wallet } from "ethers";
import { createRedeemTx, RedeemParams } from "@/utils/redeem";


export default function useRedeemPosition() {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const redeemPosition = useCallback(
    async (wallet: Wallet, params: RedeemParams): Promise<boolean> => {
      setIsRedeeming(true);
      setError(null);

      try {
        const redeemTx = createRedeemTx(params);

        // Send transaction directly with wallet
        const tx = await wallet.sendTransaction({
          to: redeemTx.to,
          data: redeemTx.data,
          value: redeemTx.value,
        });

        await tx.wait();
        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to redeem position");
        setError(error);
        console.error("Redeem error:", error);
        throw error;
      } finally {
        setIsRedeeming(false);
      }
    },
    []
  );

  return {
    isRedeeming,
    error,
    redeemPosition,
  };
}

