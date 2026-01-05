/**
 * useUserApiCredentials Hook
 *
 * Migrated from /hooks/useUserApiCredentials.ts
 * Creates or derives User API Credentials for CLOB trading
 */

import { useCallback } from 'react';
import { ClobClient } from '@polymarket/clob-client';
import { CLOB_API_URL, POLYGON_CHAIN_ID } from '../constants/polymarket';
import type { Wallet } from 'ethers';

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

/**
 * This hook's sole purpose is to derive or create
 * the User API Credentials with a temporary ClobClient
 */
export default function useUserApiCredentials() {
  /**
   * Creates temporary clobClient with ethers wallet signer
   */
  const createOrDeriveUserApiCredentials = useCallback(
    async (wallet: Wallet): Promise<UserApiCredentials> => {
      if (!wallet) {
        throw new Error('Wallet not available');
      }

      try {
        // Temporary ClobClient which will be destroyed immediately
        // after getting the user's User API Credentials
        const tempClient = new ClobClient(
          CLOB_API_URL,
          POLYGON_CHAIN_ID,
          wallet
        );

        // Try to derive the user's existing API key first (for returning users)
        // or create a new one if it doesn't exist.

        try {
          // Prompts signer for a signature to derive their User API Credentials
          const creds = await tempClient.deriveApiKey();

          // Validate that derived credentials actually have values
          if (creds?.key && creds?.secret && creds?.passphrase) {
            console.log(
              'Successfully derived existing User API Credentials',
              creds
            );
            return creds;
          } else {
            console.log(
              'Derived credentials are invalid, creating new ones...'
            );
            throw new Error('Invalid derived credentials');
          }
        } catch (deriveError) {
          // If derive fails or returns invalid data, create new User API Credentials
          console.log('Creating new User API Credentials...');
          // Prompts signer for a signature to create their User API Credentials
          const creds = await tempClient.createApiKey();
          console.log('Successfully created new User API Credentials', creds);
          return creds;
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to get credentials');
        throw error;
      }
    },
    []
  );

  return {
    createOrDeriveUserApiCredentials,
  };
}
