import type { ExtensionMessage, MessageResponse, MessageType } from '../shared/types';
import { handleCreateAlgoOrder, handleCancelAlgoOrder, handleGetAlgoOrders, handlePauseAlgoOrder, handleResumeAlgoOrder } from './handlers/algo-order-handlers';
import { handleCreatePriceAlert, handleDeletePriceAlert, handleDismissPriceAlert, handleGetAlertHistory, handleGetPriceAlerts, handleSnoozePriceAlert, handleUpdatePriceAlert } from './handlers/alert-handlers';
import { handleGetClobOrders } from './handlers/clob-order-handlers';
import { handleCreateLimitOrder, handleCancelLimitOrder, handleDeleteLimitOrder, handleGetLimitOrders, handleGetPendingLimitOrders } from './handlers/limit-order-handlers';
import { handleGetPortfolio } from './handlers/portfolio-handlers';
import { handleGetPositions, handleQuickSellPosition, handleRedeemPosition, handleRefreshPositions } from './handlers/position-handlers';
import { handleGetDailyLoss, handleGetRiskSettings, handleResetRiskSettings, handleUpdateRiskSettings } from './handlers/risk-settings-handlers';
import { handleClearTradingSession, handleGetWalletAddresses, handleInitializeTradingSession } from './handlers/trading-session-handlers';

type Handler<K extends MessageType> = (message: Extract<ExtensionMessage, { type: K }>) => Promise<MessageResponse>;

export const MESSAGE_HANDLERS: { [K in MessageType]: Handler<K> } = {
  INITIALIZE_TRADING_SESSION: (message) =>
    handleInitializeTradingSession(message.privateKey, message.proxyAddress),
  CLEAR_TRADING_SESSION: () => handleClearTradingSession(),
  GET_WALLET_ADDRESSES: () => handleGetWalletAddresses(),
  CREATE_ALGO_ORDER: (message) => handleCreateAlgoOrder(message.order),
  PAUSE_ALGO_ORDER: (message) => handlePauseAlgoOrder(message.orderId),
  RESUME_ALGO_ORDER: (message) => handleResumeAlgoOrder(message.orderId),
  CANCEL_ALGO_ORDER: (message) => handleCancelAlgoOrder(message.orderId),
  GET_ALGO_ORDERS: () => handleGetAlgoOrders(),
  GET_CLOB_ORDERS: () => handleGetClobOrders(),
  GET_POSITIONS: (message) => handleGetPositions(message.proxyAddress),
  REFRESH_POSITIONS: (message) => handleRefreshPositions(message.proxyAddress),
  QUICK_SELL_POSITION: (message) => handleQuickSellPosition(message.position),
  REDEEM_POSITION: (message) => handleRedeemPosition(message.position),
  GET_PRICE_ALERTS: () => handleGetPriceAlerts(),
  CREATE_PRICE_ALERT: (message) => handleCreatePriceAlert(message.alert),
  UPDATE_PRICE_ALERT: (message) => handleUpdatePriceAlert(message.alertId, message.updates),
  DELETE_PRICE_ALERT: (message) => handleDeletePriceAlert(message.alertId),
  SNOOZE_PRICE_ALERT: (message) => handleSnoozePriceAlert(message.alertId, message.durationMinutes),
  DISMISS_PRICE_ALERT: (message) => handleDismissPriceAlert(message.alertId),
  GET_ALERT_HISTORY: () => handleGetAlertHistory(),
  GET_PORTFOLIO: (message) => handleGetPortfolio(message.proxyAddress),
  GET_LIMIT_ORDERS: () => handleGetLimitOrders(),
  GET_PENDING_LIMIT_ORDERS: () => handleGetPendingLimitOrders(),
  CREATE_LIMIT_ORDER: (message) => handleCreateLimitOrder(message.order),
  CANCEL_LIMIT_ORDER: (message) => handleCancelLimitOrder(message.orderId),
  DELETE_LIMIT_ORDER: (message) => handleDeleteLimitOrder(message.orderId),
  GET_RISK_SETTINGS: () => handleGetRiskSettings(),
  UPDATE_RISK_SETTINGS: (message) => handleUpdateRiskSettings(message.payload),
  RESET_RISK_SETTINGS: () => handleResetRiskSettings(),
  GET_DAILY_LOSS: () => handleGetDailyLoss()
};
