/**
 * Shared TypeScript Types
 *
 * Common types used across the Chrome extension
 */

import { TradingSession, SessionStep } from '../../storage/session';

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

/**
 * Message Types for chrome.runtime messaging
 */
export type MessageType =
  | 'EXECUTE_ORDER'
  | 'GET_SESSION'
  | 'UPDATE_SESSION'
  | 'CLEAR_SESSION'
  | 'CREATE_ALGO_ORDER'
  | 'CANCEL_ALGO_ORDER'
  | 'GET_ALGO_ORDERS'
  | 'UNLOCK_WALLET'
  | 'LOCK_WALLET';

export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

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
