export interface TradingSession {
  eoaAddress: string;
  proxyAddress: string;
  isProxyDeployed: boolean;
  hasApiCredentials: boolean;
  hasApprovals: boolean;
  apiCredentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
  lastChecked: number;
}

export type SessionStep =
  | "idle"
  | "checking"
  | "credentials"
  | "approvals"
  | "complete";

export const saveSession = (address: string, session: TradingSession): void => {
  localStorage.setItem(
    `polymarket_trading_session_${address.toLowerCase()}`,
    JSON.stringify(session)
  );
};

export const clearSession = (address: string): void => {
  localStorage.removeItem(
    `polymarket_trading_session_${address.toLowerCase()}`
  );
};
