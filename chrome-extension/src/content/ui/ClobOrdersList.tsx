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
  const [isExpanded, setIsExpanded] = useState(true);
  const intervalRef = React.useRef<number | null>(null);

  useEffect(() => {
    loadOrders();
    // Refresh every 10 seconds
    intervalRef.current = window.setInterval(loadOrders, 10000);
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const loadOrders = async () => {
    // Check if extension context is still valid
    if (!chrome?.runtime?.sendMessage) {
      console.error('[ClobOrdersList] Extension context invalidated');
      setError('Extension was reloaded. Please refresh this page.');
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
      } else {
        throw new Error(response?.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load orders';
      console.error('[ClobOrdersList] Error:', errorMessage);

      // Check if this is a context invalidation error
      if (errorMessage.includes('Extension context invalidated') ||
          errorMessage.includes('message channel closed') ||
          chrome.runtime?.lastError?.message?.includes('Extension context invalidated')) {
        setError('Extension was reloaded. Please refresh this page.');
        // Stop auto-refresh
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
        return { bg: '#dcfce7', text: '#15803d' };
      case 'MATCHED':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'CANCELLED':
        return { bg: '#fee2e2', text: '#991b1b' };
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

  if (error && orders.length === 0) {
    return (
      <div style={{
        padding: '12px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '13px', color: '#991b1b', marginBottom: '8px' }}>
          ⚠️ {error}
        </div>
        <button
          onClick={loadOrders}
          style={{
            padding: '6px 12px',
            background: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
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
    <div style={{ marginBottom: '16px' }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          background: '#f0f9ff',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: isExpanded ? '12px' : 0,
          border: '1px solid #bae6fd'
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0c4a6e' }}>
          📋 Real Orders on Exchange ({orders.length})
        </div>
        <span style={{ fontSize: '16px', color: '#0c4a6e' }}>
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
            }}>
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              border: '2px dashed #e5e7eb',
              borderRadius: '6px',
              background: '#f9fafb'
            }}>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                No open orders on the exchange
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                Place an order to see it here
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                          color: order.side === 'BUY' ? '#10b981' : '#ef4444'
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
                            <div style={{ fontWeight: 600, color: '#10b981' }}>
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
