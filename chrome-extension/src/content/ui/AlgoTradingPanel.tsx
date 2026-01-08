/**
 * Algorithmic Trading Panel
 *
 * Main UI component injected into polymarket.com pages
 * Displays wallet status, algo order creation, and active orders
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useWallet } from '../../shared/providers/WalletProvider';
import WalletUnlock from './WalletUnlock';
import ActiveOrdersList from './ActiveOrdersList';
import ClobOrdersList from './ClobOrdersList';
import PositionsList from './PositionsList';
import LoadingSpinner from './LoadingSpinner';
import ManualOrderForm from './ManualOrderForm';
import { usePositions } from '../../shared/hooks/usePositions';
import { getAlgoOrders } from '../../storage/algo-orders';
import type { AlgoOrder, ExtensionMessage, MessageResponse, CreateLimitOrderRequest, CreateMarketOrderRequest } from '../../shared/types';
import type { PolymarketPosition } from '../../shared/types/positions';
import type { AlgoOrderFormData } from './AlgoOrderForm';

const AlgoOrderForm = React.lazy(() => import('./AlgoOrderForm'));
const OrderHistory = React.lazy(() => import('./OrderHistory'));

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

  const loadActiveOrders = useCallback(async () => {
    try {
      const orders = await getAlgoOrders();
      // Filter only active and paused orders
      const active = orders.filter((o: AlgoOrder) =>
        o.status === 'ACTIVE' || o.status === 'PAUSED'
      );
      setActiveOrders(active);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  }, []);

  // Load active orders when wallet is unlocked
  useEffect(() => {
    if (isUnlocked) {
      loadActiveOrders();
    }
  }, [isUnlocked, loadActiveOrders]);

  // Helper to safely send messages to service worker
  const sendMessage = (message: ExtensionMessage, callback?: (response: any) => void) => {
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

  const sendMessageAsync = (message: ExtensionMessage): Promise<MessageResponse> =>
    new Promise((resolve) => {
      sendMessage(message, (response) => {
        resolve(response || { success: false, error: 'No response from extension.' });
      });
    });

  const handleExecuteMarketOrder = async (order: CreateMarketOrderRequest) => {
    const response = await sendMessageAsync({
      type: 'EXECUTE_MARKET_ORDER',
      order
    });

    if (response.success) {
      alert('✅ Market order placed.');
      refreshPositions();
    }

    return response;
  };

  const handleCreateLimitOrder = async (order: CreateLimitOrderRequest) => {
    const response = await sendMessageAsync({
      type: 'CREATE_LIMIT_ORDER',
      order
    });

    if (response.success) {
      alert('✅ Limit order placed.');
      loadActiveOrders();
    }

    return response;
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
    <div
      className="algo-panel relative overflow-hidden rounded-[14px] border border-[#e2dbd1] bg-[#fbf9f6] shadow-[0_18px_40px_rgba(31,42,51,0.18)]"
      data-cy="algo-panel"
    >
      {/* Panel Header */}
      <div
        className="flex cursor-pointer items-start justify-between border-b border-[#e2dbd1] px-5 py-4"
        onClick={() => setIsExpanded(!isExpanded)}
        data-cy="algo-panel-header"
      >
        <div>
          <h3 className="m-0 text-[20px] font-semibold text-[#1f2a33]">
            Algo Trader
          </h3>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#58656f]">
            Polymarket Extension
          </div>
          {isUnlocked && eoaAddress && (
            <div className="mt-2 font-mono text-[11px] text-[#6b7a86]">
              {formatAddress(eoaAddress)}
            </div>
          )}
        </div>
        <span className="mt-1 text-[22px] font-semibold text-[#1f2a33]">
          {isExpanded ? '−' : '+'}
        </span>
      </div>

      {/* Panel Body */}
      {isExpanded && (
        <div className="space-y-4 px-5 py-4" data-cy="algo-panel-body">
          {!isUnlocked ? (
            /* Show wallet unlock if not unlocked */
            <WalletUnlock onUnlocked={() => console.log('Wallet unlocked!')} />
          ) : (
            /* Show trading interface when unlocked */
            <>
              {/* Wallet Status Bar */}
              <div className="flex items-center justify-between rounded-[12px] border border-[#e2dbd1] bg-white px-4 py-3">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a6a50]">
                    Status
                  </div>
                  <div className="text-[16px] font-semibold text-[#1f2a33]">Unlocked</div>
                  <div className="mt-1 font-mono text-[11px] text-[#6b7a86]">
                    Ready to trade
                  </div>
                </div>
                <button
                  onClick={() => lockWallet()}
                  data-cy="lock-wallet"
                  className="flex h-8 w-[92px] items-center justify-center rounded-[8px] bg-[#1f2a33] font-mono text-[11px] uppercase tracking-[0.2em] text-[#fbf9f6] transition hover:bg-[#2a3641]"
                >
                  Lock
                </button>
              </div>

              {showOrderForm ? (
                /* Show order creation form */
                <React.Suspense fallback={<LoadingSpinner size="small" message="Loading order form..." />}>
                  <AlgoOrderForm
                    onSubmit={handleCreateOrder}
                    onCancel={() => {
                      setShowOrderForm(false);
                      setOrderFormInitialData(undefined);
                    }}
                    initialData={orderFormInitialData}
                  />
                </React.Suspense>
              ) : (
                <>
                  <div className="rounded-[12px] border border-[#e2dbd1] bg-white px-4 py-3">
                    <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a6a50]">
                      Manual Orders
                    </div>
                    <ManualOrderForm
                      onExecuteMarket={handleExecuteMarketOrder}
                      onCreateLimit={handleCreateLimitOrder}
                    />
                  </div>

                  {/* Quick Actions */}
                  <button
                    onClick={() => {
                      setOrderFormInitialData(undefined);
                      setShowOrderForm(true);
                    }}
                    data-cy="create-algo-order"
                    className="flex w-full items-center justify-center rounded-[10px] bg-[#1f2a33] py-3 font-mono text-[12px] uppercase tracking-[0.22em] text-[#fbf9f6] transition hover:bg-[#2a3641]"
                  >
                    Create Algo Order
                  </button>

                  {/* My Positions Section */}
                  <div className="space-y-3">
                    <div
                      onClick={() => setShowPositions(!showPositions)}
                      data-cy="positions-toggle"
                      className={`flex cursor-pointer items-center justify-between rounded-[10px] border border-[#e2dbd1] bg-white px-4 py-3 ${showPositions ? '' : 'opacity-80'}`}
                    >
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a6a50]">
                          Positions
                        </div>
                        <div className="text-[14px] font-semibold text-[#1f2a33]">
                          {positions.length} open
                        </div>
                      </div>
                      <span className="text-[16px] text-[#6b7a86]">
                        {showPositions ? '▼' : '▶'}
                      </span>
                    </div>

                    {showPositions && (
                      <PositionsList
                        data-cy="positions-list"
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
                    <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a6a50]">
                      Orders
                    </h4>

                    <ActiveOrdersList
                      orders={activeOrders}
                      onPause={handlePauseOrder}
                      onResume={handleResumeOrder}
                      onCancel={handleCancelOrder}
                    />
                  </div>

                  {/* Order History Section */}
                  <div className="rounded-[12px] border border-[#e2dbd1] bg-white px-4 py-3">
                    <React.Suspense fallback={<div>Loading order history...</div>}>
                      <OrderHistory />
                    </React.Suspense>
                  </div>

                  {/* Info Section */}
                  <div className="rounded-[12px] border border-[#e2dbd1] bg-[#fff9f2] px-4 py-3 text-[12px] text-[#6b7a86]">
                    <div className="mb-2 font-semibold text-[#1f2a33]">
                      Available Order Types:
                    </div>
                    <ul className="ml-5 list-disc space-y-1">
                      <li>
                        <strong>Trailing Stop</strong> - Follow price movements
                      </li>
                      <li>
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
        <div className="absolute inset-0 z-[100] flex items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.9)]">
          <LoadingSpinner size="medium" message="Creating order..." />
        </div>
      )}
    </div>
  );
}
