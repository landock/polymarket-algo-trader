/**
 * Wallet Unlock Component
 *
 * Allows users to unlock their encrypted wallet with a password
 * or import a new private key if one doesn't exist yet
 */

import React, { useState } from 'react';
import { useWallet } from '../../shared/providers/WalletProvider';

interface WalletUnlockProps {
  onUnlocked?: () => void;
}

export default function WalletUnlock({ onUnlocked }: WalletUnlockProps) {
  const { hasEncryptedKey, unlockWallet, savePrivateKey, isLoading } = useWallet();
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUnlocking(true);

    try {
      await unlockWallet(password);
      setPassword('');
      onUnlocked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock wallet');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUnlocking(true);

    try {
      // Basic validation
      if (!privateKey.trim()) {
        throw new Error('Private key is required');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Remove 0x prefix if present
      const cleanKey = privateKey.trim().replace(/^0x/, '');

      // Validate hex format (64 characters)
      if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
        throw new Error('Invalid private key format');
      }

      await savePrivateKey(cleanKey, password);
      setPrivateKey('');
      setPassword('');
      setShowImport(false);
      onUnlocked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import wallet');
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading wallet...</p>
      </div>
    );
  }

  // Show import form if no encrypted key exists
  if (!hasEncryptedKey || showImport) {
    return (
      <div className="wallet-unlock">
        <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Import Wallet</h4>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
          Import your private key to get started. It will be encrypted and stored securely.
        </p>

        <form onSubmit={handleImport}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
              Private Key
            </label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
              disabled={isUnlocking}
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
              Your private key will be encrypted with AES-256-GCM
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
              Encryption Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={isUnlocking}
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
              Choose a strong password to encrypt your private key
            </p>
          </div>

          {error && (
            <div style={{
              padding: '8px 12px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#c33'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isUnlocking || !privateKey || !password}
            style={{ width: '100%', marginBottom: '8px' }}
          >
            {isUnlocking ? 'Importing...' : 'Import & Encrypt'}
          </button>

          {hasEncryptedKey && (
            <button
              type="button"
              onClick={() => setShowImport(false)}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#667eea',
                border: '1px solid #667eea'
              }}
            >
              Back to Unlock
            </button>
          )}
        </form>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#fffbea',
          border: '1px solid #ffd93d',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#886'
        }}>
          <strong>⚠️ Security Warning:</strong> Never share your private key with anyone.
          This extension stores it encrypted locally on your device.
        </div>
      </div>
    );
  }

  // Show unlock form if encrypted key exists
  return (
    <div className="wallet-unlock">
      <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Unlock Wallet</h4>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
        Enter your password to unlock your wallet and start trading.
      </p>

      <form onSubmit={handleUnlock}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={isUnlocking}
            autoFocus
            style={{ width: '100%' }}
          />
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            marginBottom: '12px',
            fontSize: '13px',
            color: '#c33'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isUnlocking || !password}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          {isUnlocking ? 'Unlocking...' : 'Unlock Wallet'}
        </button>

        <button
          type="button"
          onClick={() => setShowImport(true)}
          style={{
            width: '100%',
            background: 'transparent',
            color: '#667eea',
            border: '1px solid #667eea',
            fontSize: '12px'
          }}
        >
          Import Different Wallet
        </button>
      </form>
    </div>
  );
}
