/**
 * usePositions Hook
 *
 * React hook for fetching and managing user positions
 * Implements auto-refresh every 8 seconds
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PolymarketPosition } from '../types/positions';

interface UsePositionsReturn {
  positions: PolymarketPosition[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AUTO_REFRESH_INTERVAL_MS = 8000; // 8 seconds

export function usePositions(proxyAddress: string | undefined): UsePositionsReturn {
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  /**
   * Fetch positions from service worker
   */
  const fetchPositions = useCallback(async (force: boolean = false) => {
    if (!proxyAddress) {
      setPositions([]);
      setError(null);
      return;
    }

    // Check if extension context is still valid
    if (!chrome?.runtime?.sendMessage) {
      console.error('[usePositions] Extension context invalidated');
      setError('Extension was reloaded. Please refresh this page.');
      setIsLoading(false);
      // Clear the interval to stop auto-refresh attempts
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const messageType = force ? 'REFRESH_POSITIONS' : 'GET_POSITIONS';

      const response: any = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: messageType, proxyAddress },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response?.success) {
        setPositions(response.data || []);
        setError(null);
      } else {
        throw new Error(response?.error || 'Failed to fetch positions');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load positions';
      console.error('[usePositions] Error:', errorMessage);

      // Check if this is a context invalidation error
      if (errorMessage.includes('Extension context invalidated') ||
          errorMessage.includes('message channel closed') ||
          chrome.runtime?.lastError?.message?.includes('Extension context invalidated')) {
        setError('Extension was reloaded. Please refresh this page.');
        // Stop auto-refresh
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [proxyAddress]);

  /**
   * Manual refresh (force bypass cache)
   */
  const refresh = useCallback(async () => {
    await fetchPositions(true);
  }, [fetchPositions]);

  /**
   * Set up auto-refresh when proxyAddress is available
   */
  useEffect(() => {
    if (!proxyAddress) {
      // Clear interval if no proxy address
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchPositions(false);

    // Set up auto-refresh interval
    intervalRef.current = window.setInterval(() => {
      fetchPositions(false);
    }, AUTO_REFRESH_INTERVAL_MS);

    console.log('[usePositions] Auto-refresh enabled for', proxyAddress);

    // Cleanup on unmount or proxyAddress change
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('[usePositions] Auto-refresh disabled');
      }
    };
  }, [proxyAddress, fetchPositions]);

  return {
    positions,
    isLoading,
    error,
    refresh
  };
}
