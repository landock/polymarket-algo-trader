/**
 * Position Types
 *
 * Type definitions for Polymarket positions fetched from Data API
 */

export interface PolymarketPosition {
  // Core identity
  proxyWallet: string;
  asset: string;              // Token ID for this outcome
  conditionId: string;        // Market condition identifier

  // Position metrics
  size: number;               // Position size in shares
  avgPrice: number;           // Average entry price
  initialValue: number;       // Initial investment value
  currentValue: number;       // Current position value

  // Profit & Loss
  cashPnl: number;            // Realized profit/loss in currency
  percentPnl: number;         // P&L as percentage
  realizedPnl: number;        // Realized profit/loss
  percentRealizedPnl: number; // Realized P&L as percentage

  // Market data
  curPrice: number;           // Current price of outcome
  totalBought: number;        // Total amount bought

  // Market info
  title: string;              // Market title/question
  slug: string;               // Market URL slug
  eventSlug: string;          // Event identifier
  eventId?: string;           // Optional event ID
  icon: string;               // Market image URL

  // Outcome
  outcome: string;            // Outcome name (e.g., "Yes", "No")
  outcomeIndex: number;       // Outcome index for redemption
  oppositeOutcome: string;    // Opposite outcome name
  oppositeAsset: string;      // Opposite outcome token ID

  // Status
  endDate: string;            // Market end date
  redeemable: boolean;        // Whether position can be redeemed
  mergeable: boolean;         // Whether position can be merged
  negativeRisk: boolean;      // Whether position is neg-risk
}

export interface PositionAction {
  type: 'CREATE_ORDER' | 'QUICK_SELL' | 'VIEW_MARKET' | 'REDEEM';
  position: PolymarketPosition;
}

export interface QuickSellParams {
  asset: string;
  size: number;
  minPrice?: number;          // Slippage protection
}

export interface RedeemParams {
  conditionId: string;
  amount: number;
  outcomeIndex: number;
}

export interface PositionsCache {
  data: PolymarketPosition[];
  timestamp: number;
  proxyAddress: string;
}
