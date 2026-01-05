/**
 * Limit Orders Page
 *
 * Dedicated page for managing limit orders
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { LimitOrder } from '../storage/limit-orders';
import type { OrderSide } from '../shared/types';

const LimitOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Form state for creating new limit order
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tokenId, setTokenId] = useState('');
  const [marketQuestion, setMarketQuestion] = useState('');
  const [outcome, setOutcome] = useState('');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [size, setSize] = useState('');
  const [limitPrice, setLimitPrice] = useState('');

  useEffect(() => {
    loadOrders();
    // Refresh orders every 10 seconds
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await chrome.runtime.sendMessage({
        type: 'GET_LIMIT_ORDERS'
      });

      if (response.success) {
        setOrders(response.data || []);
        setError(null);
      } else {
        setError(response.error || 'Failed to load limit orders');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenId || !size || !limitPrice) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_LIMIT_ORDER',
        order: {
          tokenId,
          marketQuestion: marketQuestion || undefined,
          outcome: outcome || undefined,
          side,
          size: parseFloat(size),
          limitPrice: parseFloat(limitPrice)
        }
      });

      if (response.success) {
        setShowCreateForm(false);
        setTokenId('');
        setMarketQuestion('');
        setOutcome('');
        setSize('');
        setLimitPrice('');
        await loadOrders();
      } else {
        setError(response.error || 'Failed to create limit order');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this limit order?')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CANCEL_LIMIT_ORDER',
        orderId
      });

      if (response.success) {
        await loadOrders();
      } else {
        setError(response.error || 'Failed to cancel limit order');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this limit order?')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_LIMIT_ORDER',
        orderId
      });

      if (response.success) {
        await loadOrders();
      } else {
        setError(response.error || 'Failed to delete limit order');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(4)}`;
  };

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case 'PENDING': return '🟡 Pending';
      case 'FILLED': return '🟢 Filled';
      case 'CANCELLED': return '⚫ Cancelled';
      case 'FAILED': return '🔴 Failed';
      default: return status;
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const historyOrders = orders.filter(o => o.status !== 'PENDING');

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Limit Orders</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Create Limit Order'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      {showCreateForm && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Create New Limit Order</h2>
          <form onSubmit={handleCreateOrder}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Token ID *
                </label>
                <input
                  type="text"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="0x..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Side *
                </label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as OrderSide)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Size (contracts) *
                </label>
                <input
                  type="number"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="10"
                  step="0.01"
                  min="0.01"
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Limit Price *
                </label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="0.50"
                  step="0.0001"
                  min="0.0001"
                  max="0.9999"
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Market Question (optional)
                </label>
                <input
                  type="text"
                  value={marketQuestion}
                  onChange={(e) => setMarketQuestion(e.target.value)}
                  placeholder="Will X happen?"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Outcome (optional)
                </label>
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Yes / No"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              Create Limit Order
            </button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e5e7eb', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2px solid #3b82f6' : '2px solid transparent',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: activeTab === 'pending' ? '600' : '400',
            color: activeTab === 'pending' ? '#3b82f6' : '#6b7280',
            marginBottom: '-2px'
          }}
        >
          Pending ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: activeTab === 'history' ? '600' : '400',
            color: activeTab === 'history' ? '#3b82f6' : '#6b7280',
            marginBottom: '-2px'
          }}
        >
          History ({historyOrders.length})
        </button>
      </div>

      {loading && <div>Loading...</div>}

      {!loading && activeTab === 'pending' && (
        <div>
          {pendingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No pending limit orders
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {pendingOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {order.marketQuestion || order.tokenId.slice(0, 16) + '...'}
                      </div>
                      {order.outcome && (
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                          Outcome: {order.outcome}
                        </div>
                      )}
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Created: {formatDate(order.createdAt)}
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Side</div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: order.side === 'BUY' ? '#10b981' : '#ef4444'
                      }}>
                        {order.side}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Size</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{order.size}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Limit Price</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{formatPrice(order.limitPrice)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Total</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {formatPrice(order.size * order.limitPrice)}
                      </div>
                    </div>
                  </div>

                  {order.clobOrderId && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                      CLOB Order ID: {order.clobOrderId.slice(0, 16)}...
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'history' && (
        <div>
          {historyOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No order history
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {historyOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {order.marketQuestion || order.tokenId.slice(0, 16) + '...'}
                      </div>
                      {order.outcome && (
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                          Outcome: {order.outcome}
                        </div>
                      )}
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Created: {formatDate(order.createdAt)}
                      </div>
                      {order.filledAt && (
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          Filled: {formatDate(order.filledAt)}
                        </div>
                      )}
                      {order.cancelledAt && (
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          Cancelled: {formatDate(order.cancelledAt)}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Side</div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: order.side === 'BUY' ? '#10b981' : '#ef4444'
                      }}>
                        {order.side}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Size</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{order.size}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Limit Price</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{formatPrice(order.limitPrice)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                        {order.filledPrice ? 'Filled Price' : 'Total'}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {order.filledPrice ? formatPrice(order.filledPrice) : formatPrice(order.size * order.limitPrice)}
                      </div>
                    </div>
                  </div>

                  {order.error && (
                    <div style={{
                      background: '#fee',
                      border: '1px solid #fcc',
                      borderRadius: '4px',
                      padding: '8px',
                      marginBottom: '8px',
                      fontSize: '13px',
                      color: '#c33'
                    }}>
                      Error: {order.error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      style={{
                        background: '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Render the page
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<LimitOrdersPage />);
}
