/**
 * Shared TypeScript Types
 *
 * Common types used across the Chrome extension
 */

import { TradingSession, SessionStep } from '../../storage/session';
import type { PolymarketPosition } from './positions';

// Re-export storage types
export type { TradingSession, SessionStep };

/**
 * Polymarket Order Types
 */
export type OrderSide = 'BUY' | 'SELL';

export type OrderType = 'MARKET' | 'LIMIT';

export interface OrderParams {
  tokenId: string;
  size: number;
  price?: number;
  side: OrderSide;
  negRisk?: boolean;
  isMarketOrder?: boolean;
}

export interface PolymarketOrder {
  id: string;
  status: string;
  owner: string;
  maker_address: string;
  market: string;
  asset_id: string;
  side: OrderSide;
  original_size: string;
  size_matched: string;
  price: string;
  associate_trades: string[];
  outcome: string;
  created_at: number;
  expiration: string;
  order_type: string;
}

/**
 * Market Types
 */
export interface Market {
  id: string;
  question: string;
  description: string;
  end_date: string;
  game_start_time: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new_market: boolean;
  accepting_orders: boolean;
  minimum_order_size: number;
  minimum_tick_size: number;
  neg_risk: boolean;
  tokens: Token[];
  volume: string;
  volume_24hr: string;
  liquidity: string;
}

export interface Token {
  token_id: string;
  outcome: string;
  price: string;
  winner: boolean;
}

/**
 * Position Types
 */
export interface Position {
  id: string;
  market: string;
  asset_id: string;
  side: string;
  size: string;
  value: string;
  pnl: string;
}

/**
 * Wallet Types
 */
export interface WalletInfo {
  eoaAddress: string;
  proxyAddress: string;
  isProxyDeployed: boolean;
}

/**
 * Extension Settings
 */
export interface ExtensionSettings {
  workerUrl: string;
  polygonRpcUrl: string;
  marketMonitorInterval: number;
  orderRefreshInterval: number;
  enableNotifications: boolean;
  maxOrderSize: number;
  maxActiveAlgoOrders: number;
}

export interface CreateAlgoOrderRequest {
  type: AlgoOrderType;
  tokenId: string;
  side: OrderSide;
  size: number;
  trailPercent?: number;
  triggerPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  durationMinutes?: number;
  intervalMinutes?: number;
}

export interface CreateLimitOrderRequest {
  tokenId: string;
  marketQuestion?: string;
  outcome?: string;
  side: OrderSide;
  size: number;
  limitPrice: number;
}

export interface CreateMarketOrderRequest {
  tokenId: string;
  side: OrderSide;
  size: number;
}

export interface CreatePriceAlertRequest {
  tokenId: string;
  marketQuestion?: string;
  outcome?: string;
  condition: PriceAlertCondition;
  targetPrice: number;
}

/**
 * Message Types for chrome.runtime messaging
 */
export type MessageType =
  | 'INITIALIZE_TRADING_SESSION'
  | 'CLEAR_TRADING_SESSION'
  | 'GET_WALLET_ADDRESSES'
  | 'CREATE_ALGO_ORDER'
  | 'EXECUTE_MARKET_ORDER'
  | 'PAUSE_ALGO_ORDER'
  | 'RESUME_ALGO_ORDER'
  | 'CANCEL_ALGO_ORDER'
  | 'GET_ALGO_ORDERS'
  | 'GET_CLOB_ORDERS'
  | 'GET_POSITIONS'
  | 'REFRESH_POSITIONS'
  | 'QUICK_SELL_POSITION'
  | 'REDEEM_POSITION'
  | 'GET_PRICE_ALERTS'
  | 'CREATE_PRICE_ALERT'
  | 'UPDATE_PRICE_ALERT'
  | 'DELETE_PRICE_ALERT'
  | 'SNOOZE_PRICE_ALERT'
  | 'DISMISS_PRICE_ALERT'
  | 'GET_ALERT_HISTORY'
  | 'GET_PORTFOLIO'
  | 'GET_LIMIT_ORDERS'
  | 'GET_PENDING_LIMIT_ORDERS'
  | 'CREATE_LIMIT_ORDER'
  | 'CANCEL_LIMIT_ORDER'
  | 'DELETE_LIMIT_ORDER'
  | 'GET_RISK_SETTINGS'
  | 'UPDATE_RISK_SETTINGS'
  | 'RESET_RISK_SETTINGS'
  | 'GET_DAILY_LOSS';

type MessagePayloads = {
  INITIALIZE_TRADING_SESSION: { privateKey: string; proxyAddress?: string };
  CLEAR_TRADING_SESSION: Record<string, never>;
  GET_WALLET_ADDRESSES: Record<string, never>;
  CREATE_ALGO_ORDER: { order: CreateAlgoOrderRequest };
  EXECUTE_MARKET_ORDER: { order: CreateMarketOrderRequest };
  PAUSE_ALGO_ORDER: { orderId: string };
  RESUME_ALGO_ORDER: { orderId: string };
  CANCEL_ALGO_ORDER: { orderId: string };
  GET_ALGO_ORDERS: Record<string, never>;
  GET_CLOB_ORDERS: Record<string, never>;
  GET_POSITIONS: { proxyAddress: string };
  REFRESH_POSITIONS: { proxyAddress: string };
  QUICK_SELL_POSITION: { position: PolymarketPosition };
  REDEEM_POSITION: { position: PolymarketPosition };
  GET_PRICE_ALERTS: Record<string, never>;
  CREATE_PRICE_ALERT: { alert: CreatePriceAlertRequest };
  UPDATE_PRICE_ALERT: { alertId: string; updates: Partial<PriceAlert> };
  DELETE_PRICE_ALERT: { alertId: string };
  SNOOZE_PRICE_ALERT: { alertId: string; durationMinutes?: number };
  DISMISS_PRICE_ALERT: { alertId: string };
  GET_ALERT_HISTORY: Record<string, never>;
  GET_PORTFOLIO: { proxyAddress?: string };
  GET_LIMIT_ORDERS: Record<string, never>;
  GET_PENDING_LIMIT_ORDERS: Record<string, never>;
  CREATE_LIMIT_ORDER: { order: CreateLimitOrderRequest };
  CANCEL_LIMIT_ORDER: { orderId: string };
  DELETE_LIMIT_ORDER: { orderId: string };
  GET_RISK_SETTINGS: Record<string, never>;
  UPDATE_RISK_SETTINGS: { payload: Partial<RiskSettings> };
  RESET_RISK_SETTINGS: Record<string, never>;
  GET_DAILY_LOSS: Record<string, never>;
};

export type ExtensionMessage = {
  [Type in MessageType]: { type: Type } & MessagePayloads[Type]
}[MessageType];

export type MessageResponse = {
  success: boolean;
  data?: any;
  error?: string;
} & Record<string, any>;

/**
 * Algorithmic Order Types
 */
export type AlgoOrderType = 'TRAILING_STOP' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TWAP';

export type AlgoOrderStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface OrderExecution {
  price: number;
  size: number;
  timestamp: number;
  orderId?: string;
}

export interface TrailingStopParams {
  trailPercent: number;
  triggerPrice?: number;
}

export interface StopLossParams {
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

export interface TWAPParams {
  totalSize: number;
  durationMinutes: number;
  intervalMinutes: number;
  startTime: number;
}

export type AlgoOrderParams = TrailingStopParams | StopLossParams | TWAPParams;

export interface AlgoOrder {
  id: string;
  type: AlgoOrderType;
  status: AlgoOrderStatus;
  tokenId: string;
  side: OrderSide;
  size: number;
  createdAt: number;
  updatedAt: number;

  // Type-specific params
  params: AlgoOrderParams;

  // Execution tracking
  entryPrice?: number;
  highestPrice?: number;
  lowestPrice?: number;
  executedSize?: number;
  isActivated?: boolean;
  executionHistory: OrderExecution[];

  // Market info (cached)
  marketQuestion?: string;
  outcome?: string;
}

/**
 * Builder Config Types (for remote signing)
 */
export interface BuilderSigningResponse {
  POLY_BUILDER_SIGNATURE: string;
  POLY_BUILDER_TIMESTAMP: string;
  POLY_BUILDER_API_KEY: string;
  POLY_BUILDER_PASSPHRASE: string;
}

/**
 * Order History Types
 */
export interface OrderHistoryEntry {
  id: string;
  timestamp: number;
  orderType: 'MARKET' | 'LIMIT' | 'ALGO';
  algoType?: AlgoOrderType;
  tokenId: string;
  side: OrderSide;
  size: number;
  price: number;
  executedPrice?: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  marketQuestion?: string;
  outcome?: string;
  algoOrderId?: string;
  clobOrderId?: string;
  error?: string;
}

/**
 * Price Alert Types
 */
export type PriceAlertCondition = 'ABOVE' | 'BELOW';

export type PriceAlertStatus = 'ACTIVE' | 'TRIGGERED' | 'SNOOZED' | 'DISMISSED';

export interface PriceAlert {
  id: string;
  tokenId: string;
  marketQuestion?: string;
  outcome?: string;
  condition: PriceAlertCondition;
  targetPrice: number;
  status: PriceAlertStatus;
  createdAt: number;
  triggeredAt?: number;
  snoozedUntil?: number;
  notificationId?: string;
}

export interface PriceAlertTrigger {
  alert: PriceAlert;
  currentPrice: number;
  timestamp: number;
}

/**
 * Portfolio Overview Types
 */
export interface PortfolioMetrics {
  totalValue: number;              // Total portfolio value in USD
  realizedPnL: number;              // Realized P&L from completed trades
  unrealizedPnL: number;            // Unrealized P&L from open positions
  totalPnL: number;                 // Total P&L (realized + unrealized)
  totalPnLPercent: number;          // Total P&L as percentage
  positionCount: number;            // Number of open positions
  totalVolume: number;              // Total trading volume (from order history)
  lastUpdated: number;              // Timestamp of last calculation
}

export interface PositionBreakdown {
  tokenId: string;
  marketQuestion: string;
  outcome: string;
  size: number;                     // Position size in shares
  currentValue: number;             // Current position value in USD
  percentOfPortfolio: number;       // Percentage of total portfolio value
  unrealizedPnL: number;            // Unrealized profit/loss
  unrealizedPnLPercent: number;     // Unrealized P&L as percentage
}

/**
 * Risk Management Types
 */
export interface RiskSettings {
  maxPositionSizePerMarket: number;  // Max position size per market (in USD)
  maxDailyLoss: number;              // Max daily loss limit (in USD)
  maxTotalExposure: number;          // Max total portfolio exposure (in USD)
  enableRiskChecks: boolean;         // Enable/disable risk checks
  updatedAt: number;                 // Last updated timestamp
}

export interface DailyLossTracking {
  date: string;                      // YYYY-MM-DD format
  totalLoss: number;                 // Cumulative loss for the day (positive number = loss)
  trades: Array<{
    timestamp: number;
    pnl: number;                     // Profit (negative) or Loss (positive)
    orderId: string;
  }>;
}
