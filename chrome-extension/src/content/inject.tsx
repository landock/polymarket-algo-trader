/**
 * Content Script - Polymarket Page Injection
 *
 * Injects algorithmic trading UI into polymarket.com pages
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import QueryProvider from '../shared/providers/QueryProvider';
import WalletProvider from '../shared/providers/WalletProvider';
import TradingProvider from '../shared/providers/TradingProvider';
import AlgoTradingPanel from './ui/AlgoTradingPanel';

// Only inject on polymarket.com
if (window.location.hostname.includes('polymarket.com')) {
  // Create container for extension UI
  const container = document.createElement('div');
  container.id = 'polymarket-algo-extension';
  container.setAttribute('data-extension-id', chrome.runtime.id);
  container.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
  `;

  // Wait for page to load before injecting
  const inject = () => {
    if (document.body) {
      document.body.appendChild(container);

      // Render React app
      const root = ReactDOM.createRoot(container);
      root.render(
        <QueryProvider>
          <WalletProvider>
            <TradingProvider>
              <AlgoTradingPanel />
            </TradingProvider>
          </WalletProvider>
        </QueryProvider>
      );
    } else {
      // Retry if body not ready
      setTimeout(inject, 100);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
}
