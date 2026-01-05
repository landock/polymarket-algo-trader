/**
 * Builder API Credentials Component
 *
 * Allows users to enter and save their Polymarket Builder API credentials
 */

import React, { useState, useEffect } from 'react';

interface BuilderCredentialsProps {
  onSaved?: () => void;
}

export default function BuilderCredentials({ onSaved }: BuilderCredentialsProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiPassphrase, setApiPassphrase] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    checkCredentials();
  }, []);

  const checkCredentials = async () => {
    try {
      const result = await chrome.storage.local.get('builder_credentials');
      setHasCredentials(!!result.builder_credentials);
    } catch (error) {
      console.error('Failed to check credentials:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      if (!apiKey || !apiSecret || !apiPassphrase) {
        throw new Error('All fields are required');
      }

      // Store credentials in chrome.storage
      await chrome.storage.local.set({
        builder_credentials: {
          apiKey,
          apiSecret,
          apiPassphrase,
        },
      });

      console.log('Builder credentials saved');
      setApiKey('');
      setApiSecret('');
      setApiPassphrase('');
      setShowForm(false);
      setHasCredentials(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear your Builder API credentials?')) {
      try {
        await chrome.storage.local.remove('builder_credentials');
        setHasCredentials(false);
        console.log('Builder credentials cleared');
      } catch (error) {
        console.error('Failed to clear credentials:', error);
      }
    }
  };

  if (hasCredentials && !showForm) {
    return (
      <div style={{
        padding: '12px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '6px',
        marginBottom: '12px'
      }}>
        <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 500, marginBottom: '8px' }}>
          ✓ Builder API Credentials Configured
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '11px',
              background: 'transparent',
              color: '#15803d',
              border: '1px solid #86efac'
            }}
          >
            Update
          </button>
          <button
            onClick={handleClear}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '11px',
              background: 'transparent',
              color: '#dc2626',
              border: '1px solid #fca5a5'
            }}
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px',
      background: '#fffbea',
      border: '1px solid #ffd93d',
      borderRadius: '6px',
      marginBottom: '12px'
    }}>
      <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '13px' }}>
        Builder API Credentials Required
      </h4>
      <p style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>
        To execute trades, you need Polymarket Builder API credentials.
      </p>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '12px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Enter API Credentials
        </button>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 500 }}>
              API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your Builder API Key"
              disabled={isSaving}
              style={{ width: '100%', fontSize: '11px' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 500 }}>
              API Secret
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Your Builder API Secret"
              disabled={isSaving}
              style={{ width: '100%', fontSize: '11px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 500 }}>
              API Passphrase
            </label>
            <input
              type="password"
              value={apiPassphrase}
              onChange={(e) => setApiPassphrase(e.target.value)}
              placeholder="Your Builder API Passphrase"
              disabled={isSaving}
              style={{ width: '100%', fontSize: '11px' }}
            />
          </div>

          {error && (
            <div style={{
              padding: '8px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              marginBottom: '8px',
              fontSize: '11px',
              color: '#c33'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '11px',
                background: 'transparent',
                color: '#666',
                border: '1px solid #ddd'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !apiKey || !apiSecret || !apiPassphrase}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '11px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                opacity: isSaving ? 0.5 : 1
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div style={{
        marginTop: '12px',
        padding: '8px',
        background: '#fff',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#666'
      }}>
        <strong>ℹ️ Note:</strong> Your credentials are stored locally in the extension and only used to sign API requests.
      </div>
    </div>
  );
}
