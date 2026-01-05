/**
 * useRelayClient Hook
 *
 * Remote signing has been removed. This hook remains as a stub to avoid
 * breaking older imports.
 */

import { useCallback } from 'react';

export default function useRelayClient() {
  const initializeRelayClient = useCallback(async () => {
    throw new Error('Relay client is no longer supported in this build.');
  }, []);

  const clearRelayClient = useCallback(() => {}, []);

  return {
    relayClient: null,
    initializeRelayClient,
    clearRelayClient,
  };
}
