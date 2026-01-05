/**
 * CLOB Order Types
 *
 * Types for real orders from Polymarket CLOB API
 */

export interface ClobOrder {
  id: string;
  status: string; // e.g., 'LIVE', 'MATCHED', 'CANCELLED'
  owner: string;
  maker_address: string;
  market: string; // condition ID
  asset_id: string; // token ID
  side: 'BUY' | 'SELL';
  original_size: string;
  size_matched: string;
  price: string;
  associate_trades?: any[];
  outcome: string;
  created_at: string; // ISO timestamp
  expiration?: number;
  order_type?: string;
}

// OpenOrdersResponse from @polymarket/clob-client is just an array of OpenOrder
export type OpenOrdersResponse = ClobOrder[];
