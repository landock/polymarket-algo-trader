/**
 * Extension Settings/Options Page
 *
 * Configuration interface for the Polymarket Algo Trader extension
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './tailwind.css';

function SettingsApp() {
  return (
    <div
      style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
      data-cy="settings-root"
    >
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
        Polymarket Algo Trader - Settings
      </h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Configure your algorithmic trading preferences
      </p>

      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Backend Configuration
        </h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Polygon RPC URL
          </label>
          <input
            type="text"
            placeholder="https://polygon-rpc.com"
            data-cy="rpc-url-input"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Algo Trading Settings
        </h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Market Monitor Interval (seconds)
          </label>
          <select
            data-cy="monitor-interval"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: '8px' }} data-cy="notifications-toggle" />
            <span>Enable notifications for algo order executions</span>
          </label>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#dc2626' }}>
          Danger Zone
        </h2>
        <button
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer'
          }}
          data-cy="clear-data"
          onClick={() => {
            if (confirm('Are you sure you want to clear all data?')) {
              chrome.storage.local.clear(() => {
                alert('All data cleared');
              });
            }
          }}
        >
          Clear All Data
        </button>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
          This will remove all stored sessions, settings, and encrypted keys
        </p>
      </div>

      <div style={{ marginTop: '32px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          Setup Instructions
        </h3>
        <ol style={{ fontSize: '14px', color: '#666', marginLeft: '20px' }}>
          <li style={{ marginBottom: '4px' }}>Visit polymarket.com and open the extension</li>
          <li style={{ marginBottom: '4px' }}>Import your Magic Link private key</li>
          <li>Start trading with algorithmic orders!</li>
        </ol>
      </div>
    </div>
  );
}

// Render settings
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<SettingsApp />);
}
