/**
 * Extension Popup
 *
 * Main popup interface for the Polymarket Algo Trader extension
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import QueryProvider from '../shared/providers/QueryProvider';
import WalletProvider from '../shared/providers/WalletProvider';
import TradingProvider from '../shared/providers/TradingProvider';

function PopupApp() {
  return (
    <div style={{ padding: '20px', minWidth: '400px' }} data-cy="popup-root">
      <h1
        style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}
        data-cy="popup-title"
      >
        Polymarket Algo Trader
      </h1>
      <p style={{ marginBottom: '12px', color: '#666' }}>
        Algorithmic trading for Polymarket
      </p>

      <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          Quick Actions
        </h2>
        <button
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '8px'
          }}
          data-cy="open-polymarket"
          onClick={() => {
            chrome.tabs.create({ url: 'https://polymarket.com' });
          }}
        >
          Open Polymarket
        </button>

        <button
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '8px'
          }}
          data-cy="open-order-history"
          onClick={() => {
            chrome.windows.create({
              url: chrome.runtime.getURL('popup/order-history.html'),
              type: 'popup',
              width: 800,
              height: 600
            });
          }}
        >
          Order History
        </button>

        <button
          style={{
            background: '#f5f5f5',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            width: '100%'
          }}
          data-cy="open-settings"
          onClick={() => {
            chrome.runtime.openOptionsPage();
          }}
        >
          Settings
        </button>
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
        v1.0.0 - Phase 2 Complete
      </div>
    </div>
  );
}

// Render popup
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <QueryProvider>
      <WalletProvider>
        <TradingProvider>
          <PopupApp />
        </TradingProvider>
      </WalletProvider>
    </QueryProvider>
  );
}
