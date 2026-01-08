/**
 * Limit Orders Entry
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

const LimitOrdersPage = React.lazy(() => import('./limit-orders/LimitOrdersPage'));

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <React.Suspense fallback={<div>Loading limit orders...</div>}>
        <LimitOrdersPage />
      </React.Suspense>
    </React.StrictMode>
  );
}
