import { useState, useCallback } from "react";
import { TransferParams } from '../utils/transfers';

export default function useUsdcTransfer() {
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const transferUsdc = useCallback(
    async (
      _relayClient: unknown,
      params: TransferParams
    ): Promise<boolean> => {
      setIsTransferring(true);
      setError(null);

      try {
        throw new Error(
          `USDC.e transfers are no longer supported in this build (recipient: ${params.recipient}).`
        );
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to transfer USDC.e");
        setError(error);
        console.error("Transfer error:", error);
        throw error;
      } finally {
        setIsTransferring(false);
      }
    },
    []
  );

  return {
    isTransferring,
    error,
    transferUsdc,
  };
}
