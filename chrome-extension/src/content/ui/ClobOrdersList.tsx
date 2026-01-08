/**
 * CLOB Orders List Component
 *
 * Displays real orders from Polymarket CLOB exchange
 */

import React, { useState, useEffect } from 'react';
import type { ClobOrder } from '../../shared/types/clob-orders';

export default function ClobOrdersList() {
  const [orders, setOrders] = useState<ClobOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresSession, setRequiresSession] = useState(false);
  const [contextInvalidated, setContextInvalidated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const intervalRef = React.useRef<number | null>(null);
  const reloadTimeoutRef = React.useRef<number | null>(null);

  const isE2EContextInvalidated = () =>
    document?.documentElement?.getAttribute('data-e2e-context-invalidated') === '1';

  useEffect(() => {
    if (isE2EContextInvalidated()) {
      setError('Extension was reloaded. Please refresh this page.');
      setContextInvalidated(true);
      scheduleAutoReload();
      return;
    }

    loadOrders();
    // Refresh every 10 seconds
    intervalRef.current = window.setInterval(loadOrders, 10000);
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (reloadTimeoutRef.current !== null) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
    };
  }, []);

  const ensureAutoRefresh = () => {
    if (intervalRef.current === null) {
      intervalRef.current = window.setInterval(loadOrders, 10000);
    }
  };

  const scheduleAutoReload = () => {
    if (reloadTimeoutRef.current === null) {
      reloadTimeoutRef.current = window.setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };

  const clearAutoReload = () => {
    if (reloadTimeoutRef.current !== null) {
      clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }
  };

  const loadOrders = async () => {
    if (isE2EContextInvalidated()) {
      setError('Extension was reloaded. Please refresh this page.');
      setContextInvalidated(true);
      scheduleAutoReload();
      setIsLoading(false);
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Check if extension context is still valid
    if (!chrome?.runtime?.sendMessage) {
      console.error('[ClobOrdersList] Extension context invalidated');
      setError('Extension was reloaded. Please refresh this page.');
      setContextInvalidated(true);
      scheduleAutoReload();
      setIsLoading(false);
      // Stop auto-refresh
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setRequiresSession(false);
    ensureAutoRefresh();

    try {
      const response: any = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'GET_CLOB_ORDERS' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response?.success) {
        setOrders(response.data || []);
        setContextInvalidated(false);
        clearAutoReload();
      } else {
        throw new Error(response?.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load orders';
      const isNoSession = errorMessage.includes('No active trading session');
      if (!isNoSession) {
        console.error('[ClobOrdersList] Error:', errorMessage);
      }

      // Check if this is a context invalidation error
      if (errorMessage.includes('Extension context invalidated') ||
          errorMessage.includes('message channel closed') ||
          chrome.runtime?.lastError?.message?.includes('Extension context invalidated')) {
        setError('Extension was reloaded. Please refresh this page.');
        setContextInvalidated(true);
        scheduleAutoReload();
        // Stop auto-refresh
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (isNoSession) {
        setRequiresSession(true);
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(4)}`;
  };

  const formatSize = (size: string) => {
    return parseFloat(size).toFixed(2);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'LIVE':
        return { bg: '#f1f2e6', text: '#7b8f5a' };
      case 'MATCHED':
        return { bg: '#f6f0e6', text: '#7a5a3a' };
      case 'CANCELLED':
        return { bg: '#f6ecec', text: '#8b3a3a' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const calculateFilled = (order: ClobOrder) => {
    const original = parseFloat(order.original_size);
    const matched = parseFloat(order.size_matched);
    const remaining = original - matched;
    const percentFilled = original > 0 ? (matched / original) * 100 : 0;

    return { matched, remaining, percentFilled };
  };

  if (contextInvalidated) {
    return (
      <div style={{
        padding: '12px',
        background: '#f6f0e6',
        border: '1px solid #d7c7ab',
        borderRadius: '8px',
        marginBottom: '16px'
      }} data-cy="clob-orders-context-invalidated">
        <div style={{ fontSize: '12px', color: '#7a5a3a', marginBottom: '8px' }}>
          🔄 Extension reloaded. Refreshing this page in a moment.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '6px 12px',
            background: '#1f2a33',
            color: '#fbf9f6',
            border: 'none',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Reload now
        </button>
      </div>
    );
  }

  if (requiresSession && orders.length === 0) {
    return (
      <div style={{
        padding: '12px',
        background: '#f6f0e6',
        border: '1px solid #d7c7ab',
        borderRadius: '8px',
        marginBottom: '16px'
      }} data-cy="clob-orders-session-required">
        <div style={{ fontSize: '12px', color: '#7a5a3a', marginBottom: '8px' }}>
          🔒 Unlock your wallet to load exchange orders.
        </div>
        <button
          onClick={loadOrders}
          style={{
            padding: '6px 12px',
            background: '#1f2a33',
            color: '#fbf9f6',
            border: 'none',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div style={{
        padding: '12px',
        background: '#f6ecec',
        border: '1px solid #e5c6c6',
        borderRadius: '8px',
        marginBottom: '16px'
      }} data-cy="clob-orders-error">
        <div style={{ fontSize: '13px', color: '#8b3a3a', marginBottom: '8px' }}>
          ⚠️ {error}
        </div>
        <button
          onClick={loadOrders}
          style={{
            padding: '6px 12px',
            background: '#b24b4b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '16px' }} data-cy="clob-orders">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          background: '#fff9f2',
          borderRadius: '10px',
          cursor: 'pointer',
          marginBottom: isExpanded ? '12px' : 0,
          border: '1px solid #e2dbd1'
        }}
        data-cy="clob-orders-toggle"
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#8a6a50', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          📋 Real Orders on Exchange ({orders.length})
        </div>
        <span style={{ fontSize: '16px', color: '#6b7a86' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <>
          {isLoading && orders.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '13px'
            }} data-cy="clob-orders-loading">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              border: '2px dashed #e2dbd1',
              borderRadius: '10px',
              background: '#fff9f2'
            }} data-cy="clob-orders-empty">
              <div style={{ fontSize: '13px', color: '#6b7a86' }}>
                No open orders on the exchange
              </div>
              <div style={{ fontSize: '11px', color: '#9aa5b1', marginTop: '4px' }}>
                Place an order to see it here
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }} data-cy="clob-orders-list">
              {orders.map((order) => {
                const { matched, remaining, percentFilled } = calculateFilled(order);
                const statusColor = getStatusColor(order.status);

                return (
                  <div
                    key={order.id}
                    style={{
                      padding: '12px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}
                    data-cy={`clob-order-${order.id}`}
                  >
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: order.side === 'BUY' ? '#7b8f5a' : '#b24b4b'
                        }}>
                          {order.side}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {order.outcome}
                        </span>
                      </div>
                      <div style={{
                        padding: '2px 8px',
                        background: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {order.status}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      marginBottom: '8px',
                      padding: '8px',
                      background: '#f9fafb',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: '11px' }}>Price</div>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {formatPrice(order.price)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: '11px' }}>Size</div>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {formatSize(order.original_size)}
                        </div>
                      </div>
                      {matched > 0 && (
                        <>
                          <div>
                            <div style={{ color: '#6b7280', fontSize: '11px' }}>Filled</div>
                            <div style={{ fontWeight: 600, color: '#7b8f5a' }}>
                              {formatSize(order.size_matched)} ({percentFilled.toFixed(0)}%)
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#6b7280', fontSize: '11px' }}>Remaining</div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>
                              {remaining.toFixed(2)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      Created: {formatTimestamp(order.created_at)}
                    </div>

                    {/* Order ID (truncated) */}
                    <div style={{
                      fontSize: '10px',
                      color: '#9ca3af',
                      marginTop: '4px',
                      fontFamily: 'monospace'
                    }}>
                      ID: {order.id.slice(0, 16)}...
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Refresh indicator */}
          {isLoading && orders.length > 0 && (
            <div style={{
              padding: '6px',
              textAlign: 'center',
              fontSize: '11px',
              color: '#6b7280',
              background: '#f9fafb',
              borderRadius: '4px',
              marginTop: '8px'
            }}>
              Refreshing...
            </div>
          )}
        </>
      )}
    </div>
  );
}
