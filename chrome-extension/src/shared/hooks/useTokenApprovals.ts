/**
 * useTokenApprovals Hook
 *
 * Migrated from /hooks/useTokenApprovals.ts
 * Uses relayClient to set all required token approvals for trading (gasless)
 */

import { useCallback } from 'react';
import { checkAllApprovals } from '../utils/approvals';

export default function useTokenApprovals() {
  const checkAllTokenApprovals = useCallback(async (proxyAddress: string) => {
    try {
      return await checkAllApprovals(proxyAddress);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to check approvals');
      throw error;
    }
  }, []);

  const setAllTokenApprovals = useCallback(async (): Promise<boolean> => {
    console.error('Token approvals via relay are no longer supported.');
    return false;
  }, []);

  return {
    checkAllTokenApprovals,
    setAllTokenApprovals,
  };
}
