/**
 * Limit Orders Page
 *
 * Dedicated page for managing limit orders
 */

import React, { useEffect, useState } from 'react';
import type { LimitOrder } from '../../storage/limit-orders';
import type { OrderSide } from '../../shared/types';
import LimitOrdersForm from './LimitOrdersForm';
import LimitOrdersList from './LimitOrdersList';

export default function LimitOrdersPage() {
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tokenId, setTokenId] = useState('');
  const [marketQuestion, setMarketQuestion] = useState('');
  const [outcome, setOutcome] = useState('');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [size, setSize] = useState('');
  const [limitPrice, setLimitPrice] = useState('');

  useEffect(() => {
    loadOrders();
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
        <LimitOrdersForm
          tokenId={tokenId}
          marketQuestion={marketQuestion}
          outcome={outcome}
          side={side}
          size={size}
          limitPrice={limitPrice}
          onTokenIdChange={setTokenId}
          onMarketQuestionChange={setMarketQuestion}
          onOutcomeChange={setOutcome}
          onSideChange={setSide}
          onSizeChange={setSize}
          onLimitPriceChange={setLimitPrice}
          onSubmit={handleCreateOrder}
        />
      )}

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
        <LimitOrdersList
          orders={pendingOrders}
          mode="pending"
          formatDate={formatDate}
          formatPrice={formatPrice}
          getStatusBadge={getStatusBadge}
          onCancel={handleCancelOrder}
          onDelete={handleDeleteOrder}
        />
      )}

      {!loading && activeTab === 'history' && (
        <LimitOrdersList
          orders={historyOrders}
          mode="history"
          formatDate={formatDate}
          formatPrice={formatPrice}
          getStatusBadge={getStatusBadge}
          onCancel={handleCancelOrder}
          onDelete={handleDeleteOrder}
        />
      )}
    </div>
  );
}
