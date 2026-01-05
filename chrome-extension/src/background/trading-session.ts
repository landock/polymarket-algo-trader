/**
 * Trading Session Manager for Service Worker
 *
 * Manages the active trading session including wallet and CLOB client.
 * The session is initialized when the user unlocks their wallet in the UI,
 * and the decrypted private key is passed to the service worker.
 *
 * Security:
 * - Private key stored in memory only (not persisted)
 * - Cleared on browser close or manual lock
 * - Session expires after inactivity
 */

import { ClobClient, Side, AssetType, OrderType } from '@polymarket/clob-client';
import { Wallet, providers } from 'ethers';
import axios from 'axios';
import fetchAdapter from './axios-fetch-adapter';
import { getAddress, keccak256, concat } from 'viem';
import {
  FACTORY,
  IMPLEMENTATION,
  PROXY_BYTECODE_TEMPLATE,
} from '../shared/constants/proxyWallet';
import { validateOrder, validateBalance, formatValidationErrors } from './order-validation';
import { retryWithBackoff } from './retry-utility';

// Configure axios to use fetch adapter for service worker compatibility
// Service workers don't have XMLHttpRequest, only Fetch API
axios.defaults.adapter = fetchAdapter as any;

// Polymarket Constants
const CLOB_API_URL = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;
const POLYGON_RPC_URL = 'https://polygon-rpc.com';

interface TradingSession {
  wallet: Wallet;
  clobClient: ClobClient | null;
  eoaAddress: string;
  proxyAddress: string | null;
  createdAt: number;
  lastActivity: number;
}

// In-memory session (not persisted)
let activeSession: TradingSession | null = null;

// Session timeout: 1 hour of inactivity
const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

/**
 * Initialize a trading session with a decrypted private key
 */
export async function initializeTradingSession(
  privateKey: string,
  proxyAddress?: string
): Promise<void> {
  try {
    console.log('[TradingSession] Initializing trading session');

    // Create provider for Polygon network
    const provider = new providers.JsonRpcProvider(POLYGON_RPC_URL, POLYGON_CHAIN_ID);

    // Create wallet from private key and connect to provider
    const wallet = new Wallet(
      privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
      provider
    );

    console.log('[TradingSession] Wallet connected to Polygon RPC');

    console.log('[TradingSession] EOA Address:', wallet.address);

    const derivedProxyAddress =
      proxyAddress || deriveProxyAddress(wallet.address);
    console.log('[TradingSession] Proxy Address:', derivedProxyAddress);

    const apiCredentials = await createOrDeriveApiCredentials(wallet, derivedProxyAddress);

    // Initialize CLOB client
    // signatureType = 1 for Magic wallets (EOA signs for proxy)
    const clobClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      wallet,
      apiCredentials,
      1,
      derivedProxyAddress
    );

    // Store session in memory
    activeSession = {
      wallet,
      clobClient,
      eoaAddress: wallet.address,
      proxyAddress: derivedProxyAddress,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    console.log('[TradingSession] ✅ Session initialized');

    console.log('[TradingSession] Session initialized for', wallet.address);
  } catch (error) {
    console.error('[TradingSession] Failed to initialize session:', error);
    throw new Error('Failed to initialize trading session');
  }
}

function deriveProxyAddress(eoaAddress: string): string {
  const proxyBytecode = PROXY_BYTECODE_TEMPLATE.replace(
    '%s',
    FACTORY.slice(2).toLowerCase()
  ).replace('%s', IMPLEMENTATION.slice(2).toLowerCase());

  const salt = keccak256(eoaAddress as `0x${string}`);
  const initCodeHash = keccak256(proxyBytecode as `0x${string}`);
  const hash = keccak256(
    concat(['0xff', FACTORY as `0x${string}`, salt, initCodeHash])
  );

  return getAddress(`0x${hash.slice(26)}`);
}

async function createOrDeriveApiCredentials(wallet: Wallet, proxyAddress: string) {
  // Create temp client with proxy address and signatureType=1 for proxy wallet setup
  const tempClient = new ClobClient(
    CLOB_API_URL,
    POLYGON_CHAIN_ID,
    wallet,
    undefined, // No creds yet
    1, // signatureType for proxy
    proxyAddress
  );

  try {
    const creds = await tempClient.deriveApiKey();
    if (creds?.key && creds?.secret && creds?.passphrase) {
      console.log('[TradingSession] Derived existing API credentials');
      return creds;
    }
  } catch (error) {
    console.warn('[TradingSession] Failed to derive API credentials, creating new ones:', error);
  }

  console.log('[TradingSession] Creating new API credentials');
  return tempClient.createApiKey();
}

/**
 * Get the active trading session
 */
export function getActiveTradingSession(): TradingSession | null {
  if (!activeSession) {
    return null;
  }

  // Check if session has expired
  const inactivityTime = Date.now() - activeSession.lastActivity;
  if (inactivityTime > SESSION_TIMEOUT_MS) {
    console.log('[TradingSession] Session expired due to inactivity');
    clearTradingSession();
    return null;
  }

  // Update last activity
  activeSession.lastActivity = Date.now();

  return activeSession;
}

/**
 * Check if there's an active trading session
 */
export function hasTradingSession(): boolean {
  return getActiveTradingSession() !== null;
}

/**
 * Get wallet addresses from active session
 */
export function getWalletAddresses(): { eoaAddress: string; proxyAddress: string } | null {
  const session = getActiveTradingSession();

  if (!session || !session.proxyAddress) {
    return null;
  }

  return {
    eoaAddress: session.eoaAddress,
    proxyAddress: session.proxyAddress
  };
}

/**
 * Clear the active trading session
 */
export function clearTradingSession(): void {
  if (activeSession) {
    console.log('[TradingSession] Clearing trading session');

    // Clear sensitive data
    activeSession = null;
  }
}

/**
 * Get user's USDC balance
 */
async function getUSDCBalance(): Promise<number> {
  const session = getActiveTradingSession();

  if (!session?.clobClient) {
    return 0;
  }

  try {
    const balanceResponse = await retryWithBackoff(
      () => session.clobClient!.getBalanceAllowance({
        asset_type: AssetType.COLLATERAL
      }),
      { maxRetries: 2 }
    );

    return parseFloat(balanceResponse.balance || '0');
  } catch (error) {
    console.error('[TradingSession] Failed to fetch USDC balance:', error);
    return 0;
  }
}

/**
 * Get user's token balance for a specific outcome
 */
async function getTokenBalance(tokenId: string): Promise<number> {
  const session = getActiveTradingSession();

  if (!session?.clobClient) {
    return 0;
  }

  try {
    const balanceResponse = await retryWithBackoff(
      () => session.clobClient!.getBalanceAllowance({
        asset_type: AssetType.CONDITIONAL,
        token_id: tokenId
      }),
      { maxRetries: 2 }
    );

    return parseFloat(balanceResponse.balance || '0');
  } catch (error) {
    console.error('[TradingSession] Failed to fetch token balance:', error);
    return 0;
  }
}

/**
 * Execute a market order
 */
export async function executeMarketOrder(
  tokenId: string,
  side: 'BUY' | 'SELL',
  size: number
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const session = getActiveTradingSession();

  if (!session) {
    return { success: false, error: 'No active trading session' };
  }

  if (!session.clobClient) {
    return { success: false, error: 'CLOB client not initialized' };
  }

  try {
    console.log(`[TradingSession] Executing market order: ${side} ${size} of ${tokenId}`);

    // Fetch current market price
    const currentPrice = await getTokenPrice(tokenId);
    if (!currentPrice) {
      return { success: false, error: 'Unable to fetch current price' };
    }
    console.log(`[TradingSession] 📊 Current market price: $${currentPrice.toFixed(4)}`);

    // Use current price with slippage tolerance instead of extreme prices
    const slippage = 0.05; // 5% slippage tolerance
    const marketPrice = side === 'BUY'
      ? Math.min(currentPrice * (1 + slippage), 0.99)  // Cap at 0.99
      : Math.max(currentPrice * (1 - slippage), 0.01); // Floor at 0.01

    // Validate order parameters
    const orderValidation = validateOrder(tokenId, side, size, marketPrice);
    if (!orderValidation.isValid) {
      const errorMsg = formatValidationErrors(orderValidation.errors);
      console.error('[TradingSession] Order validation failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    // Check balance
    console.log('[TradingSession] Checking balance...');
    const balance = side === 'BUY'
      ? await getUSDCBalance()
      : await getTokenBalance(tokenId);

    const balanceValidation = validateBalance(side, size, marketPrice, balance);
    if (!balanceValidation.isValid) {
      const errorMsg = formatValidationErrors(balanceValidation.errors);
      console.error('[TradingSession] Balance check failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log(`[TradingSession] ✅ Balance sufficient: ${balance.toFixed(2)} ${side === 'BUY' ? 'USDC' : 'shares'}`);

    // Fetch required market metadata
    console.log('[TradingSession] Fetching market metadata...');
    const [tickSize, negRisk] = await Promise.all([
      session.clobClient.getTickSize(tokenId),
      session.clobClient.getNegRisk(tokenId)
    ]);

    const orderArgs = {
      tokenID: tokenId,
      size: size,
      price: marketPrice,
      side: side === 'BUY' ? Side.BUY : Side.SELL,
    };

    console.log(`[TradingSession] 📝 Creating ${side} order:`);
    console.log(`[TradingSession]    Size: ${size} contracts`);
    console.log(`[TradingSession]    Limit Price: $${marketPrice.toFixed(4)} (${slippage * 100}% slippage)`);
    console.log(`[TradingSession]    Total Cost: $${(size * marketPrice).toFixed(2)}`);

    // Use createAndPostOrder with required options
    // Try to use FOK (Fill-Or-Kill) for immediate execution if available
    console.log('[TradingSession] Creating and posting market order...');
    const orderOptions: any = { tickSize, negRisk };

    // Try to set order type to FOK if available
    if (typeof OrderType !== 'undefined' && OrderType.FOK) {
      orderOptions.orderType = OrderType.FOK;
      console.log('[TradingSession] Using FOK (Fill-Or-Kill) order type');
    }

    const response = await session.clobClient.createAndPostOrder(
      orderArgs,
      orderOptions
    );
    console.log('[TradingSession] Response:', JSON.stringify(response));

    if (response.success && response.orderID) {
      console.log(`[TradingSession] ✅ Order placed successfully:`, response.orderID);
      return { success: true, orderId: response.orderID };
    } else {
      const errorMsg = response.error || 'Unknown error';
      console.error('[TradingSession] ❌ Order failed:', response);

      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    console.error('[TradingSession] Failed to execute order:', error);
    return { success: false, error: error.message || 'Failed to execute order' };
  }
}

/**
 * Execute a limit order
 */
export async function executeLimitOrder(
  tokenId: string,
  side: 'BUY' | 'SELL',
  size: number,
  price: number
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const session = getActiveTradingSession();

  if (!session) {
    return { success: false, error: 'No active trading session' };
  }

  if (!session.clobClient) {
    return { success: false, error: 'CLOB client not initialized' };
  }

  try {
    console.log(`[TradingSession] Executing limit order: ${side} ${size} of ${tokenId} @ ${price}`);

    // Validate order parameters
    const orderValidation = validateOrder(tokenId, side, size, price);
    if (!orderValidation.isValid) {
      const errorMsg = formatValidationErrors(orderValidation.errors);
      console.error('[TradingSession] Order validation failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    // Check balance
    console.log('[TradingSession] Checking balance...');
    const balance = side === 'BUY'
      ? await getUSDCBalance()
      : await getTokenBalance(tokenId);

    const balanceValidation = validateBalance(side, size, price, balance);
    if (!balanceValidation.isValid) {
      const errorMsg = formatValidationErrors(balanceValidation.errors);
      console.error('[TradingSession] Balance check failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log(`[TradingSession] ✅ Balance sufficient: ${balance.toFixed(2)} ${side === 'BUY' ? 'USDC' : 'shares'}`);

    // Fetch required market metadata
    console.log('[TradingSession] Fetching market metadata...');
    const [tickSize, negRisk] = await Promise.all([
      session.clobClient.getTickSize(tokenId),
      session.clobClient.getNegRisk(tokenId)
    ]);

    // Fetch current market price for comparison
    const currentPrice = await getTokenPrice(tokenId);
    if (currentPrice) {
      console.log(`[TradingSession] 📊 Current market price: $${currentPrice.toFixed(4)}`);
      const percentDiff = ((price - currentPrice) / currentPrice * 100).toFixed(2);
      console.log(`[TradingSession] 📊 Your limit price is ${percentDiff}% ${parseFloat(percentDiff) > 0 ? 'above' : 'below'} market`);
    }

    // Create limit order request
    const orderArgs = {
      tokenID: tokenId,
      size: size,
      price: price,
      side: side === 'BUY' ? Side.BUY : Side.SELL,
    };

    console.log(`[TradingSession] 📝 Creating ${side} limit order:`);
    console.log(`[TradingSession]    Size: ${size} contracts`);
    console.log(`[TradingSession]    Limit Price: $${price.toFixed(4)}`);
    console.log(`[TradingSession]    Total Cost: $${(size * price).toFixed(2)}`);

    // Use createAndPostOrder with required options
    const response = await session.clobClient.createAndPostOrder(
      orderArgs,
      { tickSize, negRisk }
    );

    if (response.success && response.orderID) {
      console.log(`[TradingSession] ✅ Limit order placed successfully:`, response.orderID);
      return { success: true, orderId: response.orderID };
    } else {
      console.error('[TradingSession] ❌ Limit order failed:', response);
      return { success: false, error: response.error || 'Unknown error' };
    }
  } catch (error: any) {
    console.error('[TradingSession] Failed to execute order:', error);
    return { success: false, error: error.message || 'Failed to execute order' };
  }
}

/**
 * Get open orders from CLOB
 */
export async function getOpenOrders(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const session = getActiveTradingSession();

  if (!session) {
    return { success: false, error: 'No active trading session' };
  }

  if (!session.clobClient) {
    return { success: false, error: 'CLOB client not initialized' };
  }

  try {
    console.log('[TradingSession] Fetching open orders from CLOB...');

    // Use retry logic with shorter delays to prevent message channel timeout
    const orders = await retryWithBackoff(
      () => session.clobClient!.getOpenOrders(),
      {
        maxRetries: 1,
        initialDelayMs: 300,
        maxDelayMs: 1000
      }
    );

    console.log(`[TradingSession] ✅ Found ${orders.length} open orders`);

    return { success: true, data: orders };
  } catch (error: any) {
    console.error('[TradingSession] Failed to fetch open orders:', error);
    return { success: false, error: error.message || 'Failed to fetch open orders' };
  }
}

/**
 * Get current market price for a token
 */
export async function getTokenPrice(tokenId: string): Promise<number | null> {
  const session = getActiveTradingSession();

  if (!session) {
    console.warn('[TradingSession] No active session, cannot fetch price');
    return null;
  }

  if (!session.clobClient) {
    console.warn('[TradingSession] CLOB client not initialized, cannot fetch price');
    return null;
  }

  try {
    // Use dedicated methods from CLOB client for accurate prices
    const [buyPriceRes, sellPriceRes, midpointRes] = await Promise.all([
      session.clobClient.getPrice(tokenId, Side.BUY),
      session.clobClient.getPrice(tokenId, Side.SELL),
      session.clobClient.getMidpoint(tokenId)
    ]);

    const buyPrice = parseFloat(buyPriceRes.price || '0');
    const sellPrice = parseFloat(sellPriceRes.price || '0');
    const midPrice = parseFloat(midpointRes.mid || '0');

    console.log(`[TradingSession] 💰 Token price for ${tokenId.slice(0, 12)}...`);
    console.log(`[TradingSession]    Buy Price (Ask): $${buyPrice.toFixed(4)}`);
    console.log(`[TradingSession]    Sell Price (Bid): $${sellPrice.toFixed(4)}`);
    console.log(`[TradingSession]    Mid Price: $${midPrice.toFixed(4)}`);

    // Return midpoint as the "current price"
    return midPrice > 0 ? midPrice : null;
  } catch (error) {
    console.error(`[TradingSession] Failed to fetch price for ${tokenId}:`, error);
    return null;
  }
}
