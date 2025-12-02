export const CLOB_API_URL = "https://clob.polymarket.com";

export const RELAYER_URL = "https://relayer-v2.polymarket.com/";

export const POLYMARKET_PROFILE_URL = (address: string) =>
  `https://polymarket.com/${address}`;

export const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

export const POLYGON_CHAIN_ID = 137;

export const SESSION_STORAGE_KEY = "polymarket_trading_session";

export const REMOTE_SIGNING_URL = () =>
  typeof window !== "undefined"
    ? `${window.location.origin}/api/polymarket/sign`
    : "/api/polymarket/sign";
