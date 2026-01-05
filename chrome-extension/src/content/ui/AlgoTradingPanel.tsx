/**
 * Algorithmic Trading Panel
 *
 * Main UI component injected into polymarket.com pages
 * Displays wallet status, algo order creation, and active orders
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from '../../shared/providers/WalletProvider';
import WalletUnlock from './WalletUnlock';
import AlgoOrderForm, { AlgoOrderFormData } from './AlgoOrderForm';
import ActiveOrdersList from './ActiveOrdersList';
import ClobOrdersList from './ClobOrdersList';
import OrderHistory from './OrderHistory';
import PositionsList from './PositionsList';
import LoadingSpinner from './LoadingSpinner';
import { usePositions } from '../../shared/hooks/usePositions';
import type { AlgoOrder } from '../../shared/types';
import type { PolymarketPosition } from '../../shared/types/positions';

export default function AlgoTradingPanel() {
  const { isUnlocked, eoaAddress, proxyAddress, lockWallet } = useWallet();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [activeOrders, setActiveOrders] = useState<AlgoOrder[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [showPositions, setShowPositions] = useState(true);
  const [orderFormInitialData, setOrderFormInitialData] = useState<Partial<AlgoOrderFormData> | undefined>(undefined);

  // Fetch positions using the hook (auto-refreshes every 8 seconds)
  // Use proxy address as that's the wallet that executes trades
  const { positions, isLoading: isLoadingPositions, error: positionsError, refresh: refreshPositions } = usePositions(proxyAddress);

  // Load active orders when wallet is unlocked
  useEffect(() => {
    if (isUnlocked) {
      loadActiveOrders();
    }
  }, [isUnlocked]);

  const loadActiveOrders = async () => {
    try {
      const result = await chrome.storage.local.get('algo_orders');
      const orders = result.algo_orders || [];
      // Filter only active and paused orders
      const active = orders.filter((o: AlgoOrder) =>
        o.status === 'ACTIVE' || o.status === 'PAUSED'
      );
      setActiveOrders(active);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  // Helper to safely send messages to service worker
  const sendMessage = (message: any, callback?: (response: any) => void) => {
    try {
      if (!chrome?.runtime?.sendMessage) {
        console.error('Extension context invalidated. Please reload this page.');
        alert('Extension was reloaded. Please refresh this page to continue.');
        return;
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError);
          alert('Extension connection lost. Please reload this page.');
          return;
        }
        callback?.(response);
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Extension connection lost. Please reload this page.');
    }
  };

  const handleCreateOrder = (orderData: AlgoOrderFormData) => {
    console.log('Creating algo order:', orderData);
    setIsCreatingOrder(true);

    sendMessage({
      type: 'CREATE_ALGO_ORDER',
      order: orderData
    }, (response) => {
      setIsCreatingOrder(false);

      if (response?.success) {
        console.log('Algo order created:', response.orderId);
        setShowOrderForm(false);
        loadActiveOrders();

        // Show success feedback
        setTimeout(() => {
          alert('✅ Order created successfully!');
        }, 100);
      } else {
        console.error('Failed to create order:', response?.error);
        alert(`❌ Failed to create order: ${response?.error || 'Unknown error'}`);
      }
    });
  };

  const handlePauseOrder = (orderId: string) => {
    sendMessage({
      type: 'PAUSE_ALGO_ORDER',
      orderId
    }, () => {
      loadActiveOrders();
    });
  };

  const handleResumeOrder = (orderId: string) => {
    sendMessage({
      type: 'RESUME_ALGO_ORDER',
      orderId
    }, () => {
      loadActiveOrders();
    });
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      sendMessage({
        type: 'CANCEL_ALGO_ORDER',
        orderId
      }, () => {
        loadActiveOrders();
      });
    }
  };

  // Position action handlers
  const handleCreateOrderFromPosition = (position: PolymarketPosition) => {
    console.log('Create order from position:', position);

    // Pre-fill order form with position data
    // Default to selling the current position to close/reduce it
    setOrderFormInitialData({
      tokenId: position.asset,
      side: 'SELL',
      size: position.size,
      type: 'TRAILING_STOP' // Default order type
    });

    setShowOrderForm(true);
  };

  const handleQuickSell = (position: PolymarketPosition) => {
    const message = `Quick sell ${position.size} shares of "${position.title}" (${position.outcome})?\n\nEstimated proceeds: $${(position.size * position.curPrice).toFixed(2)}`;
    if (confirm(message)) {
      sendMessage({
        type: 'QUICK_SELL_POSITION',
        position
      }, (response) => {
        if (response?.success) {
          alert(`✅ Position sold successfully!\nOrder ID: ${response.orderId}`);
          refreshPositions();
        } else {
          alert(`❌ Failed to sell: ${response?.error || 'Unknown error'}`);
        }
      });
    }
  };

  const handleViewMarket = (position: PolymarketPosition) => {
    const marketUrl = `https://polymarket.com/event/${position.eventSlug}`;
    window.open(marketUrl, '_blank');
  };

  const handleRedeem = (position: PolymarketPosition) => {
    const message = `Redeem ${position.size} shares of "${position.title}" (${position.outcome})?`;
    if (confirm(message)) {
      sendMessage({
        type: 'REDEEM_POSITION',
        position
      }, (response) => {
        if (response?.success) {
          alert(`✅ Position redeemed successfully!`);
          refreshPositions();
        } else {
          alert(`❌ ${response?.error || 'Redemption failed'}`);
        }
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="algo-panel" style={{ position: 'relative' }}>
      {/* Panel Header */}
      <div
        className="algo-panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Algo Trading
          </h3>
          {isUnlocked && eoaAddress && (
            <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
              {formatAddress(eoaAddress)}
            </div>
          )}
        </div>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
          {isExpanded ? '−' : '+'}
        </span>
      </div>

      {/* Panel Body */}
      {isExpanded && (
        <div className="algo-panel-body">
              {!isUnlocked ? (
            /* Show wallet unlock if not unlocked */
            <WalletUnlock onUnlocked={() => console.log('Wallet unlocked!')} />
          ) : (
            /* Show trading interface when unlocked */
            <>
              {/* Wallet Status Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 500 }}>
                    ✓ Wallet Unlocked
                  </div>
                  <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '2px' }}>
                    Ready to trade
                  </div>
                </div>
                <button
                  onClick={() => lockWallet()}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'transparent',
                    color: '#15803d',
                    border: '1px solid #86efac'
                  }}
                >
                  Lock
                </button>
              </div>

              {showOrderForm ? (
                /* Show order creation form */
                <AlgoOrderForm
                  onSubmit={handleCreateOrder}
                  onCancel={() => {
                    setShowOrderForm(false);
                    setOrderFormInitialData(undefined);
                  }}
                  initialData={orderFormInitialData}
                />
              ) : (
                <>
                  {/* Quick Actions */}
                  <button
                    onClick={() => {
                      setOrderFormInitialData(undefined);
                      setShowOrderForm(true);
                    }}
                    style={{
                      width: '100%',
                      marginBottom: '16px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    + Create Algo Order
                  </button>

                  {/* My Positions Section */}
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      onClick={() => setShowPositions(!showPositions)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: showPositions ? '12px' : 0
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                        My Positions ({positions.length})
                      </div>
                      <span style={{ fontSize: '16px', color: '#6b7280' }}>
                        {showPositions ? '▼' : '▶'}
                      </span>
                    </div>

                    {showPositions && (
                      <PositionsList
                        positions={positions}
                        isLoading={isLoadingPositions}
                        error={positionsError}
                        onCreateOrder={handleCreateOrderFromPosition}
                        onQuickSell={handleQuickSell}
                        onViewMarket={handleViewMarket}
                        onRedeem={handleRedeem}
                        onRefresh={refreshPositions}
                      />
                    )}
                  </div>

                  {/* Real CLOB Orders Section */}
                  <ClobOrdersList />

                  {/* Active Orders Section */}
                  <div>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      marginTop: 0,
                      marginBottom: '12px',
                      color: '#333'
                    }}>
                      Algo Orders ({activeOrders.length})
                    </h4>

                    <ActiveOrdersList
                      orders={activeOrders}
                      onPause={handlePauseOrder}
                      onResume={handleResumeOrder}
                      onCancel={handleCancelOrder}
                    />
                  </div>

                  {/* Order History Section */}
                  <div style={{ marginTop: '16px' }}>
                    <OrderHistory />
                  </div>

                  {/* Info Section */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                      Available Order Types:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '4px' }}>
                        <strong>Trailing Stop</strong> - Follow price movements
                      </li>
                      <li style={{ marginBottom: '4px' }}>
                        <strong>Stop-Loss/Take-Profit</strong> - Auto exit positions
                      </li>
                      <li>
                        <strong>TWAP</strong> - Time-weighted execution
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isCreatingOrder && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          zIndex: 100
        }}>
          <LoadingSpinner size="medium" message="Creating order..." />
        </div>
      )}
    </div>
  );
}
