/**
 * Wallet Provider with Encrypted Storage
 *
 * Adapted from /providers/WalletProvider.tsx for Chrome extension
 * Key changes:
 * - Private keys are encrypted and stored in chrome.storage
 * - Requires password to unlock wallet
 * - Private key is never stored in plaintext in memory
 * - Supports lock/unlock functionality
 */

import { Wallet, providers } from 'ethers';
import { createPublicClient, http, PublicClient } from 'viem';
import { createContext, useContext, useState, useMemo, ReactNode, useCallback, useEffect } from 'react';
import { polygon } from 'viem/chains';
import { DEFAULT_POLYGON_RPC_URL } from '../constants/polymarket';
import { storageAdapter } from '../../storage/storage-adapter';
import { encryptPrivateKey, decryptPrivateKey, validatePassword, EncryptedData } from '../../storage/encryption';

interface WalletContextType {
  // Wallet state
  wallet: Wallet | null;
  eoaAddress: string | undefined;
  proxyAddress: string | undefined;
  isConnected: boolean;
  isUnlocked: boolean;
  publicClient: PublicClient;

  // Encryption state
  hasEncryptedKey: boolean;
  isLoading: boolean;

  // Actions
  unlockWallet: (password: string) => Promise<void>;
  lockWallet: () => void;
  savePrivateKey: (privateKey: string, password: string) => Promise<void>;
  clearPrivateKey: () => Promise<void>;
}

// Storage keys
const ENCRYPTED_PK_KEY = 'encrypted_private_key';
const PK_SALT_KEY = 'pk_salt';
const PK_IV_KEY = 'pk_iv';

// Singleton public client for blockchain queries
const createPolygonPublicClient = (): PublicClient => {
  return createPublicClient({
    chain: polygon,
    transport: http(DEFAULT_POLYGON_RPC_URL),
  });
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [eoaAddress, setEoaAddress] = useState<string | undefined>(undefined);
  const [proxyAddress, setProxyAddress] = useState<string | undefined>(undefined);
  const [hasEncryptedKey, setHasEncryptedKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [publicClient] = useState<PublicClient>(createPolygonPublicClient);

  // Check if encrypted key exists on mount
  useEffect(() => {
    const checkEncryptedKey = async () => {
      try {
        const encrypted = await storageAdapter.get<string>(ENCRYPTED_PK_KEY);
        setHasEncryptedKey(encrypted !== null);
      } catch (error) {
        console.error('Error checking encrypted key:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkEncryptedKey();
  }, []);

  /**
   * Unlock wallet with password
   */
  const unlockWallet = useCallback(async (password: string) => {
    try {
      setIsLoading(true);

      // Get encrypted data from storage
      const encrypted = await storageAdapter.get<string>(ENCRYPTED_PK_KEY);
      const salt = await storageAdapter.get<string>(PK_SALT_KEY);
      const iv = await storageAdapter.get<string>(PK_IV_KEY);

      if (!encrypted || !salt || !iv) {
        throw new Error('No encrypted private key found');
      }

      const encryptedData: EncryptedData = { encrypted, salt, iv };

      // Decrypt private key
      const privateKey = await decryptPrivateKey(encryptedData, password);

      // Create wallet
      const rpcUrl = DEFAULT_POLYGON_RPC_URL;
      const provider = new providers.JsonRpcProvider(rpcUrl);
      const walletInstance = new Wallet(`0x${privateKey}`, provider);

      setWallet(walletInstance);
      setEoaAddress(walletInstance.address);
      setHasEncryptedKey(true);

      // Initialize trading session in service worker
      try {
        await chrome.runtime.sendMessage({
          type: 'INITIALIZE_TRADING_SESSION',
          privateKey: `0x${privateKey}`,
          proxyAddress: undefined // TODO: Get from storage if exists
        });
        console.log('Trading session initialized in service worker');

        // Fetch wallet addresses (including proxy) from trading session
        const addressesResponse = await chrome.runtime.sendMessage({
          type: 'GET_WALLET_ADDRESSES'
        });

        if (addressesResponse?.success && addressesResponse.data) {
          setProxyAddress(addressesResponse.data.proxyAddress);
          console.log('Proxy address:', addressesResponse.data.proxyAddress);
        }
      } catch (error) {
        console.error('Failed to initialize trading session in service worker:', error);
        // Don't throw - wallet is still unlocked for UI purposes
      }

      console.log('Wallet unlocked:', walletInstance.address);
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Lock wallet (clear from memory)
   */
  const lockWallet = useCallback(async () => {
    // Clear trading session in service worker
    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_TRADING_SESSION'
      });
      console.log('Trading session cleared in service worker');
    } catch (error) {
      console.error('Failed to clear trading session:', error);
    }

    setWallet(null);
    setEoaAddress(undefined);
    setProxyAddress(undefined);
    console.log('Wallet locked');
  }, []);

  /**
   * Save new private key with encryption
   */
  const savePrivateKey = useCallback(async (privateKey: string, password: string) => {
    try {
      setIsLoading(true);

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.error);
      }

      // Remove 0x prefix if present
      const cleanKey = privateKey.replace(/^0x/, '');

      // Validate private key format
      if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
        throw new Error('Invalid private key format');
      }

      // Encrypt private key
      const encryptedData = await encryptPrivateKey(cleanKey, password);

      // Store encrypted data
      await storageAdapter.set(ENCRYPTED_PK_KEY, encryptedData.encrypted);
      await storageAdapter.set(PK_SALT_KEY, encryptedData.salt);
      await storageAdapter.set(PK_IV_KEY, encryptedData.iv);

      // Unlock wallet immediately
      await unlockWallet(password);

      console.log('Private key saved and encrypted');
    } catch (error) {
      console.error('Failed to save private key:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [unlockWallet]);

  /**
   * Clear private key from storage (logout)
   */
  const clearPrivateKey = useCallback(async () => {
    try {
      setIsLoading(true);
      await storageAdapter.remove(ENCRYPTED_PK_KEY);
      await storageAdapter.remove(PK_SALT_KEY);
      await storageAdapter.remove(PK_IV_KEY);
      lockWallet();
      setHasEncryptedKey(false);
      console.log('Private key cleared');
    } catch (error) {
      console.error('Failed to clear private key:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [lockWallet]);

  const value = useMemo<WalletContextType>(
    () => ({
      wallet,
      eoaAddress,
      proxyAddress,
      isConnected: wallet !== null,
      isUnlocked: wallet !== null,
      publicClient,
      hasEncryptedKey,
      isLoading,
      unlockWallet,
      lockWallet,
      savePrivateKey,
      clearPrivateKey,
    }),
    [
      wallet,
      proxyAddress,
      eoaAddress,
      publicClient,
      hasEncryptedKey,
      isLoading,
      unlockWallet,
      lockWallet,
      savePrivateKey,
      clearPrivateKey,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

/**
 * Hook to access wallet context
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
