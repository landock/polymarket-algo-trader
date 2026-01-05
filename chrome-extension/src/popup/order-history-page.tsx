/**
 * Order History Page
 *
 * Dedicated page for viewing comprehensive order history
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import OrderHistory from '../content/ui/OrderHistory';

function OrderHistoryPage() {
  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '16px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#111827',
          margin: 0
        }}>
          Order History
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '8px 0 0 0'
        }}>
          View and filter your trading history
        </p>
      </div>

      <OrderHistory />
    </div>
  );
}

// Render page
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<OrderHistoryPage />);
}
