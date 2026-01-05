import { useState, useCallback } from "react";
import { RedeemParams } from '../utils/redeem';

export default function useRedeemPosition() {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const redeemPosition = useCallback(
    async (
      _relayClient: unknown,
      params: RedeemParams
    ): Promise<boolean> => {
      setIsRedeeming(true);
      setError(null);

      try {
        throw new Error(
          `Position redemption is no longer supported in this build (condition: ${params.conditionId}).`
        );
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
