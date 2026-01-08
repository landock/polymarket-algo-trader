/**
 * Price Alerts Entry
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './tailwind.css';

const PriceAlertsPage = React.lazy(() => import('./price-alerts/PriceAlertsPage'));

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <React.Suspense fallback={<div>Loading price alerts...</div>}>
        <PriceAlertsPage />
      </React.Suspense>
    </React.StrictMode>
  );
}
