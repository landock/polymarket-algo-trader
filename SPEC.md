# Polymarket Algorithmic Trading Chrome Extension - Technical Specification

**Version:** 1.0.0
**Date:** January 2026
**Status:** Final

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Order Types & Algorithms](#3-order-types--algorithms)
4. [Execution Engine](#4-execution-engine)
5. [Price & Market Data](#5-price--market-data)
6. [Wallet & Security](#6-wallet--security)
7. [User Interface](#7-user-interface)
8. [Storage & Data Management](#8-storage--data-management)
9. [Notifications & Alerts](#9-notifications--alerts)
10. [Error Handling & Recovery](#10-error-handling--recovery)
11. [Validation Rules](#11-validation-rules)
12. [API Integration](#12-api-integration)
13. [Extension Lifecycle](#13-extension-lifecycle)
14. [Future Enhancements](#14-future-enhancements)
15. [Technical Requirements](#15-technical-requirements)

---

## 1. Executive Summary

This specification defines a Chrome Extension (Manifest V3) for algorithmic trading on Polymarket. The extension provides trailing stop orders, stop-loss/take-profit orders, and TWAP (Time-Weighted Average Price) execution with 24/7 market monitoring via a service worker.

### Core Principles

- **Local-first security**: Private keys encrypted with AES-256-GCM, never transmitted
- **Magic Link only**: No hardware wallet support; focused on Magic Link private keys
- **Adaptive monitoring**: Dynamic polling frequency based on market volatility
- **Graceful degradation**: Single API source with fail-safe behavior
- **Strict TypeScript**: Full strict mode, no `any` types

---

## 2. Architecture Overview

### 2.1 Component Structure

```
chrome-extension/
├── src/
│   ├── background/           # Service worker (24/7 monitoring)
│   │   ├── index.ts          # Entry point, message handling
│   │   ├── AlgoEngine.ts     # Order condition evaluation
│   │   ├── OrderManager.ts   # CRUD operations, persistence
│   │   ├── MarketMonitor.ts  # Price fetching, adaptive polling
│   │   └── ExecutionEngine.ts # Order execution, retry logic
│   ├── content/              # Injected UI on polymarket.com
│   │   ├── inject.tsx        # Entry point
│   │   └── ui/               # React components
│   ├── popup/                # Extension popup (quick status)
│   ├── shared/               # Shared utilities, types, providers
│   └── storage/              # Encrypted storage abstraction
├── manifest.json
└── webpack.config.js
```

### 2.2 Data Flow

```
User Input (Content Script)
         │
         ▼
┌─────────────────────────────────────┐
│  chrome.runtime.sendMessage()       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Service Worker                     │
│  ├── OrderManager (persistence)     │
│  ├── AlgoEngine (evaluation)        │
│  └── ExecutionEngine (trading)      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  chrome.storage.local               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Polymarket CLOB API                │
└─────────────────────────────────────┘
```

### 2.3 Multi-Tab Behavior

- **Single primary tab**: Only one Polymarket tab shows the injected panel at a time; only the leader tab runs monitoring
- Other tabs display: "Algo Trader open in another tab"
- Primary tab determined by most recent focus/interaction; tie-breaker = most recent focus timestamp
- Leadership tracked via storage heartbeat; failover if no heartbeat for 90 seconds
- State synchronized via `chrome.storage.local` events; debounced to avoid flapping

---

## 3. Order Types & Algorithms

### 3.1 Trailing Stop Orders

**Purpose**: Lock in profits by following price movements and triggering when price reverses.

**Parameters**:
| Parameter | Required | Range | Description |
|-----------|----------|-------|-------------|
| `tokenId` | Yes | string | Market token ID |
| `side` | Yes | BUY/SELL | Order side |
| `size` | Yes | 0.1 - 50,000 | Number of shares |
| `trailPercent` | Yes | 0.1% - 50% | Reversal threshold |
| `triggerPrice` | No | 0.01 - 0.99 | Activation price (optional) |

**Algorithm**:
```typescript
function evaluateTrailingStop(order: TrailingStopOrder, currentPrice: number): boolean {
  // Use mid price (bid + ask) / 2
  const midPrice = currentPrice;

  // Handle trigger price activation
  if (order.triggerPrice && !order.isActivated) {
    if (midPrice >= order.triggerPrice) {
      order.isActivated = true;
      order.highestPrice = midPrice; // Start tracking from current price (gap handling)
    }
    return false;
  }

  // Update highest price tracking
  if (midPrice > order.highestPrice) {
    order.highestPrice = midPrice;
  }

  // Calculate trail threshold
  const trailAmount = order.highestPrice * (order.trailPercent / 100);
  let stopPrice = order.highestPrice - trailAmount;

  // Clamp to minimum tradeable price
  stopPrice = Math.max(stopPrice, 0.01);

  // Trigger if price drops below threshold
  return midPrice <= stopPrice;
}
```

**Gap Handling**: If market opens above trigger price, immediately activate trailing and start tracking from current price.

### 3.2 Stop-Loss / Take-Profit Orders

**Purpose**: Automatically exit positions at predetermined price levels.

**Parameters**:
| Parameter | Required | Range | Description |
|-----------|----------|-------|-------------|
| `tokenId` | Yes | string | Market token ID |
| `side` | Yes | BUY/SELL | Order side |
| `size` | Yes | 0.1 - 50,000 | Number of shares |
| `stopLossPrice` | Conditional | 0.01 - 0.99 | Exit if price falls to this |
| `takeProfitPrice` | Conditional | 0.01 - 0.99 | Exit if price rises to this |

**Constraints**:
- At least one of `stopLossPrice` or `takeProfitPrice` must be specified
- For BUY orders: `stopLossPrice` < `takeProfitPrice` (if both set)
- For SELL orders: `stopLossPrice` > `takeProfitPrice` (if both set)

**Algorithm**:
```typescript
function evaluateStopLossTakeProfit(order: SLTPOrder, currentPrice: number): 'stop-loss' | 'take-profit' | null {
  const midPrice = currentPrice;

  // Check stop-loss
  if (order.stopLossPrice && midPrice <= order.stopLossPrice) {
    return 'stop-loss';
  }

  // Check take-profit
  if (order.takeProfitPrice && midPrice >= order.takeProfitPrice) {
    return 'take-profit';
  }

  return null;
}
```

**Execution**: Always executes as **market order** for guaranteed fill.

### 3.3 TWAP (Time-Weighted Average Price) Orders

**Purpose**: Distribute large orders over time to minimize market impact.

**Parameters**:
| Parameter | Required | Range | Description |
|-----------|----------|-------|-------------|
| `tokenId` | Yes | string | Market token ID |
| `side` | Yes | BUY/SELL | Order side |
| `size` | Yes | 0.1 - 50,000 | Total shares to trade |
| `durationMinutes` | Yes | 1 - 1,440 | Total execution window |
| `intervalMinutes` | Yes | 1 - duration | Time between slices |

**Slice Calculation**:
```typescript
const totalSlices = Math.ceil(durationMinutes / intervalMinutes);
const baseSliceSize = size / totalSlices;
```

**Adaptive Slice Sizing** (Liquidity Response):
```typescript
function calculateAdaptiveSliceSize(
  baseSize: number,
  bidAskSpread: number,
  normalSpread: number = 0.02 // 2% considered normal
): number {
  if (bidAskSpread <= normalSpread) {
    return baseSize;
  }

  // Reduce slice size proportionally to spread width
  // At 10% spread, reduce to 20% of base size
  const spreadRatio = normalSpread / bidAskSpread;
  const adjustedSize = baseSize * Math.max(spreadRatio, 0.2);

  return adjustedSize;
}
```

**Wide Spread Handling**:
- Define `spreadPauseThreshold` (default 0.05 = 5%). When current spread exceeds threshold, skip the scheduled slice instead of executing.
- Track consecutive skipped slices; notify after 3 consecutive skips and log each skip.
- Resume normal slicing once spread returns below threshold; no forced execution at window end—unfilled remainder stays unexecuted.
- Configurable threshold per order; default applies when unset.

**Catch-up Mechanism** (after service worker sleep):
```typescript
function handleTWAPCatchup(order: TWAPOrder, currentTime: number): void {
  const missedIntervals = Math.floor(
    (currentTime - order.lastExecutedAt) / (order.intervalMinutes * 60 * 1000)
  );

  if (missedIntervals > 1) {
    // Execute missed slices with rate limiting (minimum 30s between each)
    const catchupQueue = Math.min(missedIntervals - 1, 10); // Cap at 10 catch-up slices
    order.catchupSlices = catchupQueue;
    order.catchupInterval = 30000; // 30 seconds between catch-up slices
  }
}
```

---

## 4. Execution Engine

### 4.1 Order Execution Flow

```
Order Triggered
      │
      ▼
┌─────────────────┐
│ Validate        │──── Insufficient balance ───▶ Cancel order, notify user
│ Balance         │
└─────────────────┘
      │ OK
      ▼
┌─────────────────┐
│ Build Market    │
│ Order           │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Sign with       │
│ Cached Key      │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Submit to       │──── Transient error ───▶ Retry (max 3, exponential backoff)
│ CLOB API        │
└─────────────────┘
      │ Success
      ▼
┌─────────────────┐
│ Check Fill      │──── Partial fill ───▶ Queue remainder as new order
│ Status          │
└─────────────────┘
      │ Full fill
      ▼
┌─────────────────┐
│ Move to         │
│ History         │
└─────────────────┘
```

### 4.2 Partial Fill Handling

When an order receives a partial fill:

```typescript
interface PartialFillResult {
  filledSize: number;
  remainingSize: number;
  avgPrice: number;
}

function handlePartialFill(order: AlgoOrder, result: PartialFillResult): void {
  // Record the partial execution
  order.executionHistory.push({
    timestamp: Date.now(),
    price: result.avgPrice,
    size: result.filledSize,
    type: 'PARTIAL_FILL'
  });

  if (result.remainingSize > 0) {
    // Create new order for remainder
    const remainderOrder: AlgoOrder = {
      ...order,
      id: generateUUID(),
      size: result.remainingSize,
      parentOrderId: order.id,
      createdAt: Date.now(),
      executionHistory: []
    };

    // Queue for immediate execution
    orderManager.create(remainderOrder);
    orderManager.markForImmediateExecution(remainderOrder.id);
  }

  // Mark original as completed
  order.status = 'COMPLETED';
  order.completedAt = Date.now();
}
```

### 4.3 Order Conflict Resolution

When multiple orders on the same token trigger simultaneously:

```typescript
function resolveConflicts(triggeredOrders: AlgoOrder[]): AlgoOrder {
  // Group by tokenId
  const byToken = groupBy(triggeredOrders, 'tokenId');

  for (const [tokenId, orders] of Object.entries(byToken)) {
    if (orders.length > 1) {
      // Sort by creation time (oldest first)
      orders.sort((a, b) => a.createdAt - b.createdAt);

      // Execute first (oldest) order
      const winner = orders[0];

      // Cancel all other orders on same token
      for (let i = 1; i < orders.length; i++) {
        orderManager.cancel(orders[i].id, 'CONFLICT_RESOLUTION');
        notifyUser(`Order ${orders[i].id} cancelled: Another order on same market triggered first`);
      }

      return winner;
    }
  }
}
```

### 4.4 Retry Logic

```typescript
interface RetryConfig {
  maxRetries: 3;
  initialDelayMs: 1000;
  maxDelayMs: 30000;
  backoffMultiplier: 2;
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = defaultConfig
): Promise<T> {
  let lastError: Error;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry validation or balance errors
      if (isValidationError(error) || isBalanceError(error)) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }

  throw lastError;
}
```

---

## 5. Price & Market Data

### 5.1 Price Source

- **Primary source**: Polymarket CLOB API (`gamma-api.polymarket.com`)
- **Price type**: Mid price = (best bid + best ask) / 2
- **Fallback**: None - single source with graceful failure
- **No on-chain fallback**: Simplifies implementation, reduces complexity

### 5.2 Adaptive Monitoring Frequency

The service worker adjusts polling frequency based on market conditions:

**Intervals**:
- Fast mode: **5 seconds**
- Slow mode: **60 seconds**

**Volatility Score Calculation**:
```typescript
interface VolatilityFactors {
  triggerProximity: number;  // 0-1, how close to any trigger price
  recentMovement: number;    // % price change in last 5 minutes
  spreadWidth: number;       // Current bid-ask spread as %
}

function calculateVolatilityScore(factors: VolatilityFactors): number {
  const weights = {
    triggerProximity: 0.5,  // Most important
    recentMovement: 0.3,
    spreadWidth: 0.2
  };

  // Normalize each factor to 0-1 range
  const normalized = {
    triggerProximity: factors.triggerProximity, // Already 0-1
    recentMovement: Math.min(factors.recentMovement / 5, 1), // 5% = max score
    spreadWidth: Math.min(factors.spreadWidth / 10, 1) // 10% spread = max score
  };

  return (
    normalized.triggerProximity * weights.triggerProximity +
    normalized.recentMovement * weights.recentMovement +
    normalized.spreadWidth * weights.spreadWidth
  );
}

function determinePollingInterval(score: number): number {
  // Score > 0.5 = fast mode, otherwise slow mode
  // Interpolate between 5s and 60s based on score
  if (score >= 0.7) return 5000;
  if (score >= 0.5) return 15000;
  if (score >= 0.3) return 30000;
  return 60000;
}
```

**Trigger Proximity Calculation**:
```typescript
function calculateTriggerProximity(order: AlgoOrder, currentPrice: number): number {
  let minDistance = Infinity;

  if (order.type === 'TRAILING_STOP') {
    const stopPrice = order.highestPrice * (1 - order.trailPercent / 100);
    minDistance = Math.abs(currentPrice - stopPrice) / currentPrice;
  }

  if (order.stopLossPrice) {
    const distance = Math.abs(currentPrice - order.stopLossPrice) / currentPrice;
    minDistance = Math.min(minDistance, distance);
  }

  if (order.takeProfitPrice) {
    const distance = Math.abs(currentPrice - order.takeProfitPrice) / currentPrice;
    minDistance = Math.min(minDistance, distance);
  }

  // Within 5% = proximity score of 1, beyond 20% = 0
  return Math.max(0, 1 - (minDistance - 0.05) / 0.15);
}
```

### 5.3 Rate Limit Handling

When approaching API rate limits, prioritize orders by trigger proximity:

```typescript
function prioritizeOrdersForPriceFetch(orders: AlgoOrder[]): AlgoOrder[] {
  return orders.sort((a, b) => {
    const proximityA = calculateTriggerProximity(a, lastKnownPrices[a.tokenId]);
    const proximityB = calculateTriggerProximity(b, lastKnownPrices[b.tokenId]);
    return proximityB - proximityA; // Higher proximity first
  });
}
```

### 5.4 Staleness Handling

```typescript
interface PriceData {
  price: number;
  timestamp: number;
  bid: number;
  ask: number;
}

interface StalenessConfig {
  maxAgeMs: number; // User configurable, default 120000 (2 min)
}

function isPriceStale(priceData: PriceData, config: StalenessConfig): boolean {
  return Date.now() - priceData.timestamp > config.maxAgeMs;
}

function handleStalePrice(order: AlgoOrder, priceData: PriceData): void {
  if (isPriceStale(priceData, userConfig.staleness)) {
    // Skip evaluation cycle, log warning
    console.warn(`[AlgoEngine] Skipping evaluation for ${order.id}: price data stale (${formatAge(priceData.timestamp)})`);
    return;
  }
  // Proceed with evaluation
}
```

**Configuration**: Orders may override `maxAgeMs` per-order; otherwise the global default (2 minutes) applies.

---

## 6. Wallet & Security

### 6.1 Key Encryption

**Algorithm**: AES-256-GCM with PBKDF2 key derivation

```typescript
interface EncryptedKeyData {
  salt: string;        // 16 bytes, base64
  iv: string;          // 12 bytes, base64
  ciphertext: string;  // Encrypted private key, base64
  authTag: string;     // 16 bytes, base64
}

async function encryptPrivateKey(privateKey: string, password: string): Promise<EncryptedKeyData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(privateKey)
  );

  return {
    salt: base64Encode(salt),
    iv: base64Encode(iv),
    ciphertext: base64Encode(new Uint8Array(ciphertext.slice(0, -16))),
    authTag: base64Encode(new Uint8Array(ciphertext.slice(-16)))
  };
}
```

### 6.2 Key Caching

**Strategy**: Cache decrypted key with 60-second TTL

```typescript
interface KeyCache {
  key: string | null;
  expiresAt: number;
}

const keyCache: KeyCache = {
  key: null,
  expiresAt: 0
};

const KEY_CACHE_TTL_MS = 60000; // 60 seconds

function getCachedKey(): string | null {
  if (keyCache.key && Date.now() < keyCache.expiresAt) {
    // Extend TTL on access
    keyCache.expiresAt = Date.now() + KEY_CACHE_TTL_MS;
    return keyCache.key;
  }
  return null;
}

function cacheKey(key: string): void {
  keyCache.key = key;
  keyCache.expiresAt = Date.now() + KEY_CACHE_TTL_MS;
}

function clearKeyCache(): void {
  keyCache.key = null;
  keyCache.expiresAt = 0;
}
```

### 6.3 Auto-Lock Timeout

**Behavior**: Configurable timeout (default 15 minutes, range 5-60 minutes)

```typescript
interface AutoLockConfig {
  enabled: boolean;
  timeoutMinutes: number; // 5-60, default 15
}

let lastActivityTimestamp = Date.now();

function updateActivity(): void {
  lastActivityTimestamp = Date.now();
}

function checkAutoLock(config: AutoLockConfig): boolean {
  if (!config.enabled) return false;

  const idleMs = Date.now() - lastActivityTimestamp;
  const timeoutMs = config.timeoutMinutes * 60 * 1000;

  return idleMs >= timeoutMs;
}

// Special handling for active TWAP orders
function shouldAutoLock(config: AutoLockConfig): boolean {
  if (!checkAutoLock(config)) return false;

  // Continue with cached key for active executing orders
  const activeOrders = orderManager.getActiveOrders();
  const hasExecutingTWAP = activeOrders.some(
    o => o.type === 'TWAP' && o.status === 'ACTIVE' && o.lastExecutedAt
  );

  if (hasExecutingTWAP) {
    // Don't lock, but don't extend timeout either
    return false;
  }

  return true;
}
```

**Per-action prompts**: No extra re-prompt on submit/cancel; re-auth only occurs after auto-lock, which clears the cached key.

### 6.4 Password Change

**Flow**: Re-encrypt all data with new password

```typescript
async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  // 1. Decrypt with old password
  const privateKey = await decryptPrivateKey(oldPassword);

  if (!privateKey) {
    throw new Error('Invalid current password');
  }

  // 2. Re-encrypt with new password
  const newEncryptedData = await encryptPrivateKey(privateKey, newPassword);

  // 3. Store new encrypted data
  await chrome.storage.local.set({
    encrypted_private_key: newEncryptedData
  });

  // 4. Clear key cache
  clearKeyCache();

  // 5. Prompt re-authentication
  notifyUser('Password changed. Please unlock your wallet with the new password.');
}
```

### 6.5 Multi-Proxy Wallet Support

When a private key controls multiple proxy wallets:

```typescript
interface ProxyWallet {
  address: string;
  proxyAddress: string;
  lastActivity: number;
  label?: string;
}

async function detectProxyWallets(privateKey: string): Promise<ProxyWallet[]> {
  const eoaAddress = deriveAddress(privateKey);
  const proxies = await polymarketApi.getProxyWallets(eoaAddress);

  return proxies.map(proxy => ({
    address: eoaAddress,
    proxyAddress: proxy.address,
    lastActivity: proxy.lastTxTimestamp,
    label: proxy.label
  }));
}

// UI shows list for user selection
// Selected proxy stored in chrome.storage.local
```

---

## 7. User Interface

### 7.1 Injected Panel

**Position**: Fixed bottom-right corner (not draggable)

**Dimensions**:
- Collapsed: 48x48px (icon only)
- Expanded: 380px width, max 600px height (scrollable)

**Injection Strategy**: Floating overlay mode (independent of page DOM)

```typescript
function injectPanel(): void {
  // Create shadow DOM container for style isolation
  const container = document.createElement('div');
  container.id = 'polymarket-algo-trader-root';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const shadow = container.attachShadow({ mode: 'closed' });
  document.body.appendChild(container);

  // Render React app into shadow DOM
  const root = createRoot(shadow);
  root.render(<AlgoTradingPanel />);
}
```

### 7.2 Token ID Auto-Detection

Automatically detect market token ID from current Polymarket page:

```typescript
function detectTokenFromPage(): string | null {
  // Check URL for token ID
  const urlParams = new URLSearchParams(window.location.search);
  const tid = urlParams.get('tid');
  if (tid) return tid;

  // Check for market page data attributes
  const marketElement = document.querySelector('[data-market-id]');
  if (marketElement) {
    return marketElement.getAttribute('data-market-id');
  }

  // Check window.__NEXT_DATA__ for SSR data
  try {
    const nextData = (window as any).__NEXT_DATA__;
    if (nextData?.props?.pageProps?.market?.tokenId) {
      return nextData.props.pageProps.market.tokenId;
    }
  } catch {}

  return null;
}
```

### 7.3 Order Form

**Validation timing**: On blur (when leaving field)

**Smart defaults**: Pre-fill based on current market context

```typescript
interface SmartDefaults {
  tokenId: string | null;      // Auto-detected from page
  side: 'BUY' | 'SELL';        // Based on existing position
  size: number;                // Based on position size or typical order
  orderType: AlgoOrderType;    // Last used type
}

function calculateSmartDefaults(): SmartDefaults {
  const tokenId = detectTokenFromPage();
  const position = tokenId ? getPosition(tokenId) : null;

  return {
    tokenId,
    side: position ? 'SELL' : 'BUY',
    size: position ? Math.min(position.size, 100) : 10,
    orderType: userPreferences.lastOrderType || 'TRAILING_STOP'
  };
}
```

### 7.4 Active Orders Display

**Information shown**:
- Order type badge (color-coded)
- Token ID with market name (if available)
- Side and size
- Current status
- **Distance to trigger**: Percentage format (e.g., "5.2% away")
- **Unrealized P&L**: With color coding (green positive, red negative)
- **Price timestamp**: Age indicator (e.g., "2s ago")

```typescript
interface OrderDisplayData {
  id: string;
  type: AlgoOrderType;
  tokenId: string;
  marketName?: string;
  side: 'BUY' | 'SELL';
  size: number;
  status: OrderStatus;
  triggerDistance: string;     // "5.2% away"
  unrealizedPnL: number;
  pnlColor: 'green' | 'red' | 'neutral';
  priceAge: string;            // "2s ago"
  parameters: Record<string, any>;
}
```

### 7.5 Kill Switch

**Two separate buttons**:

1. **"Cancel All Algo Orders"**: Cancels all local algorithmic orders
2. **"Cancel All Exchange Orders"**: Cancels all live CLOB limit orders

```typescript
async function cancelAllAlgoOrders(): Promise<void> {
  const confirmed = await showConfirmDialog(
    'Cancel All Algo Orders?',
    'This will cancel all active trailing stops, stop-losses, and TWAP orders.'
  );

  if (confirmed) {
    const activeOrders = orderManager.getActiveOrders();
    for (const order of activeOrders) {
      await orderManager.cancel(order.id, 'USER_KILL_SWITCH');
    }
    notifyUser(`Cancelled ${activeOrders.length} algo orders`);
  }
}

async function cancelAllExchangeOrders(): Promise<void> {
  const confirmed = await showConfirmDialog(
    'Cancel All Exchange Orders?',
    'This will cancel all your live limit orders on the Polymarket CLOB.'
  );

  if (confirmed) {
    const openOrders = await clobClient.getOpenOrders();
    for (const order of openOrders) {
      await clobClient.cancelOrder(order.id);
    }
    notifyUser(`Cancelled ${openOrders.length} exchange orders`);
  }
}
```

### 7.6 Extension Popup

**Content**: Quick status overview with order counts and recent activity

```typescript
interface PopupData {
  walletStatus: 'locked' | 'unlocked';
  activeOrderCount: number;
  pausedOrderCount: number;
  recentActivity: RecentActivityItem[]; // Last 3 events
}

interface RecentActivityItem {
  type: 'EXECUTION' | 'CREATION' | 'CANCELLATION' | 'ERROR';
  message: string;
  timestamp: number;
}
```

**Layout**:
```
┌─────────────────────────────────────┐
│  🔒 Wallet Locked / 🔓 Unlocked     │
├─────────────────────────────────────┤
│  Active Orders: 5                   │
│  Paused Orders: 2                   │
├─────────────────────────────────────┤
│  Recent Activity:                   │
│  • TWAP executed slice 3/12  (2m)   │
│  • Trailing stop created     (15m)  │
│  • Position sold at $0.72    (1h)   │
├─────────────────────────────────────┤
│  [Open Polymarket]  [Lock Wallet]   │
└─────────────────────────────────────┘
```

### 7.7 Onboarding

**Strategy**: Contextual tooltip hints on first use (no formal onboarding flow)

```typescript
interface TooltipConfig {
  id: string;
  target: string;  // CSS selector
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const firstUseTooltips: TooltipConfig[] = [
  {
    id: 'wallet-unlock',
    target: '#private-key-input',
    content: 'Enter your Magic Link private key (starts with 0x)',
    position: 'top'
  },
  {
    id: 'order-type',
    target: '#order-type-select',
    content: 'Choose your algo order type: Trailing Stop, Stop-Loss/Take-Profit, or TWAP',
    position: 'bottom'
  },
  // ...more tooltips
];

function showTooltipIfFirstTime(tooltipId: string): void {
  const shown = localStorage.getItem(`tooltip_shown_${tooltipId}`);
  if (!shown) {
    displayTooltip(tooltipId);
    localStorage.setItem(`tooltip_shown_${tooltipId}`, 'true');
  }
}
```

---

## 8. Storage & Data Management

### 8.1 Storage Schema

```typescript
interface StorageSchema {
  // Wallet
  encrypted_private_key: EncryptedKeyData | null;
  wallet_address: string | null;
  selected_proxy: string | null;

  // Orders
  algo_orders: AlgoOrder[];

  // User preferences
  preferences: UserPreferences;

  // Debug
  debug_mode: boolean;
  debug_logs: DebugLogEntry[];
}

interface UserPreferences {
  autoLock: AutoLockConfig;
  staleness: StalenessConfig;
  notifications: NotificationConfig;
  lastOrderType: AlgoOrderType;
}
```

### 8.2 Order Data Structure

```typescript
interface AlgoOrder {
  // Identity
  id: string;                      // UUID
  parentOrderId?: string;          // For partial fill remainders

  // Core parameters
  type: AlgoOrderType;
  tokenId: string;
  side: 'BUY' | 'SELL';
  size: number;

  // Status
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;

  // Type-specific parameters
  trailPercent?: number;
  triggerPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  durationMinutes?: number;
  intervalMinutes?: number;

  // Trailing stop state
  highestPrice?: number;
  isActivated?: boolean;

  // TWAP state
  lastExecutedAt?: number;
  remainingSize?: number;
  slicesExecuted?: number;
  totalSlices?: number;
  catchupSlices?: number;

  // Execution tracking
  executionHistory: ExecutionRecord[];
  avgExecutionPrice?: number;
  totalExecutedSize?: number;

  // Error tracking
  lastError?: string;
  errorCount?: number;
}

interface ExecutionRecord {
  timestamp: number;
  price: number;
  size: number;
  type: 'FULL_FILL' | 'PARTIAL_FILL' | 'TWAP_SLICE';
  fillId?: string;
  gasUsed?: number;
}

type AlgoOrderType = 'TRAILING_STOP' | 'STOP_LOSS_TAKE_PROFIT' | 'TWAP';
type OrderStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
```

### 8.3 Auto-Cleanup

**Policy**: Automatically delete completed/cancelled orders older than 30 days

```typescript
async function cleanupOldOrders(): Promise<void> {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  const { algo_orders } = await chrome.storage.local.get('algo_orders');

  const filtered = algo_orders.filter(order => {
    // Keep active/paused orders
    if (order.status === 'ACTIVE' || order.status === 'PAUSED') {
      return true;
    }
    // Keep recent completed/cancelled/failed orders
    const relevantTimestamp = order.completedAt || order.updatedAt;
    return relevantTimestamp > thirtyDaysAgo;
  });

  if (filtered.length < algo_orders.length) {
    await chrome.storage.local.set({ algo_orders: filtered });
    console.log(`[Storage] Cleaned up ${algo_orders.length - filtered.length} old orders`);
  }
}

// Run daily via chrome.alarms
chrome.alarms.create('storage-cleanup', { periodInMinutes: 1440 });
```

### 8.4 Position Cache

**Strategy**: Smart invalidation

```typescript
interface PositionCache {
  data: Position[];
  timestamp: number;
  invalidated: boolean;
}

const positionCache: PositionCache = {
  data: [],
  timestamp: 0,
  invalidated: true
};

function invalidatePositionCache(): void {
  positionCache.invalidated = true;
}

function shouldRefreshPositions(lastPrice: number, currentPrice: number): boolean {
  // Invalidate if price moved >1%
  const priceChange = Math.abs(currentPrice - lastPrice) / lastPrice;
  if (priceChange > 0.01) {
    return true;
  }

  // Or if explicitly invalidated (e.g., after order placement)
  return positionCache.invalidated;
}

async function getPositions(): Promise<Position[]> {
  if (!positionCache.invalidated && !shouldRefreshPositions()) {
    return positionCache.data;
  }

  const positions = await fetchPositionsFromAPI();
  positionCache.data = positions;
  positionCache.timestamp = Date.now();
  positionCache.invalidated = false;

  return positions;
}
```

---

## 9. Notifications & Alerts

### 9.1 Browser Notifications

**Style**: Standard Chrome notifications only (no integration with Polymarket UI)

```typescript
interface NotificationConfig {
  enabled: boolean;
  audioEnabled: boolean;  // Opt-in audio alerts
  types: {
    execution: boolean;
    error: boolean;
    twapMilestone: boolean;
  };
}

async function notify(
  title: string,
  message: string,
  type: 'execution' | 'error' | 'info'
): Promise<void> {
  const config = await getNotificationConfig();

  if (!config.enabled || !config.types[type]) {
    return;
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority: type === 'error' ? 2 : 1
  });

  if (config.audioEnabled) {
    playNotificationSound(type);
  }
}
```

### 9.2 Audio Alerts

**Behavior**: Opt-in (disabled by default)

```typescript
const NOTIFICATION_SOUNDS = {
  execution: 'sounds/execution.mp3',
  error: 'sounds/error.mp3',
  info: 'sounds/info.mp3'
};

function playNotificationSound(type: keyof typeof NOTIFICATION_SOUNDS): void {
  const audio = new Audio(chrome.runtime.getURL(NOTIFICATION_SOUNDS[type]));
  audio.volume = 0.5;
  audio.play().catch(() => {
    // Audio playback failed (e.g., no user interaction yet)
  });
}
```

### 9.3 TWAP Milestone Notifications

**Milestones**: 25%, 50%, 75%, 100%

```typescript
function checkTWAPMilestone(order: TWAPOrder): number | null {
  const progress = (order.slicesExecuted / order.totalSlices) * 100;

  const milestones = [25, 50, 75, 100];
  const previousProgress = ((order.slicesExecuted - 1) / order.totalSlices) * 100;

  for (const milestone of milestones) {
    if (previousProgress < milestone && progress >= milestone) {
      return milestone;
    }
  }

  return null;
}

function notifyTWAPMilestone(order: TWAPOrder, milestone: number): void {
  notify(
    `TWAP ${milestone}% Complete`,
    `Order ${order.id.slice(0, 8)}... is ${milestone}% executed (${order.slicesExecuted}/${order.totalSlices} slices)`,
    'info'
  );
}
```

### 9.4 Gas Cost Warnings

**Threshold**: Only show if estimated gas > $0.10

```typescript
async function checkGasCost(): Promise<{ shouldWarn: boolean; estimatedCost: number }> {
  const gasPrice = await getPolygonGasPrice();
  const estimatedGas = 150000; // Typical order execution
  const maticPrice = await getMaticUsdPrice();

  const estimatedCost = (gasPrice * estimatedGas * maticPrice) / 1e18;

  return {
    shouldWarn: estimatedCost > 0.10,
    estimatedCost
  };
}
```

---

## 10. Error Handling & Recovery

### 10.1 Service Worker Crash Recovery

**Behavior**: Evaluate all active orders immediately on restart

```typescript
chrome.runtime.onStartup.addListener(async () => {
  console.log('[ServiceWorker] Starting up...');

  // Load active orders
  const activeOrders = await orderManager.getActiveOrders();

  if (activeOrders.length > 0) {
    console.log(`[ServiceWorker] Found ${activeOrders.length} active orders, evaluating...`);

    // Fetch current prices
    const prices = await fetchPricesForOrders(activeOrders);

    // Evaluate each order
    for (const order of activeOrders) {
      const price = prices[order.tokenId];
      if (price) {
        await algoEngine.evaluate(order, price);
      }
    }
  }

  // Resume normal monitoring
  startMonitoringLoop();
});
```

### 10.2 Extension Context Invalidation

**Behavior**: Floating overlay mode - render independently of page DOM

```typescript
// In content script
let panelMounted = false;

function mountPanel(): void {
  if (panelMounted) return;

  try {
    injectPanel();
    panelMounted = true;
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      showReloadPrompt();
    }
  }
}

function showReloadPrompt(): void {
  const prompt = document.createElement('div');
  prompt.innerHTML = `
    <div style="position:fixed;bottom:20px;right:20px;background:#ff4444;color:white;padding:16px;border-radius:8px;z-index:2147483647;">
      Extension was reloaded. <a href="#" onclick="location.reload();return false;" style="color:white;text-decoration:underline;">Refresh page</a>
    </div>
  `;
  document.body.appendChild(prompt);
}
```

### 10.3 Balance Validation Failure

**Behavior**: Cancel entire order (no partial execution with available balance)

```typescript
async function validateBalance(order: AlgoOrder): Promise<{ valid: boolean; error?: string }> {
  if (order.side === 'BUY') {
    const usdcBalance = await getUSDCBalance();
    const requiredAmount = order.size * getCurrentPrice(order.tokenId);

    if (usdcBalance < requiredAmount) {
      return {
        valid: false,
        error: `Insufficient USDC balance. Required: $${requiredAmount.toFixed(2)}, Available: $${usdcBalance.toFixed(2)}`
      };
    }
  } else {
    const tokenBalance = await getTokenBalance(order.tokenId);

    if (tokenBalance < order.size) {
      return {
        valid: false,
        error: `Insufficient token balance. Required: ${order.size}, Available: ${tokenBalance}`
      };
    }
  }

  return { valid: true };
}

// When triggered order fails balance check
async function handleBalanceFailure(order: AlgoOrder, error: string): Promise<void> {
  order.status = 'FAILED';
  order.lastError = error;
  order.completedAt = Date.now();
  await orderManager.update(order);

  notify(
    'Order Failed - Insufficient Balance',
    `Order ${order.id.slice(0, 8)}... could not execute: ${error}`,
    'error'
  );
}
```

### 10.4 Market Resolution Handling

**Behavior**: Depends on resolution outcome

```typescript
interface MarketResolution {
  tokenId: string;
  outcome: 'YES' | 'NO';
  timestamp: number;
}

async function handleMarketResolution(resolution: MarketResolution): Promise<void> {
  const affectedOrders = orderManager.getOrdersByToken(resolution.tokenId);

  for (const order of affectedOrders) {
    if (order.status !== 'ACTIVE') continue;

    const position = await getPosition(order.tokenId);
    const userHoldsWinningOutcome = determineIfWinning(position, resolution.outcome);

    if (userHoldsWinningOutcome) {
      // User wins - cancel algo order, let settlement happen
      order.status = 'CANCELLED';
      order.lastError = 'Market resolved in your favor - settlement pending';
      await orderManager.update(order);

      notify(
        'Market Resolved - You Win!',
        `Order cancelled for ${resolution.tokenId}. Await settlement.`,
        'info'
      );
    } else {
      // User loses - attempt to exit quickly if possible
      try {
        await executeOrder(order, 'RESOLUTION_EXIT');
      } catch (error) {
        // If exit fails, just cancel
        order.status = 'CANCELLED';
        order.lastError = 'Market resolved against position - exit attempted';
        await orderManager.update(order);
      }
    }
  }
}
```

---

## 11. Validation Rules

### 11.1 Size Limits

| Parameter | Minimum | Maximum |
|-----------|---------|---------|
| Order size | 0.1 shares | 50,000 shares |

### 11.2 Price Limits

| Parameter | Minimum | Maximum |
|-----------|---------|---------|
| Stop-loss price | 0.01 | 0.99 |
| Take-profit price | 0.01 | 0.99 |
| Trigger price | 0.01 | 0.99 |

**Boundary warnings**: Show warning if stop-loss < 0.05 or take-profit > 0.95

### 11.3 Trailing Stop Validation

```typescript
interface TrailingStopValidation {
  errors: string[];
  warnings: string[];
}

function validateTrailingStop(params: TrailingStopParams): TrailingStopValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!params.tokenId) errors.push('Token ID is required');
  if (!params.size) errors.push('Size is required');
  if (!params.trailPercent) errors.push('Trail percentage is required');

  // Size limits
  if (params.size < 0.1) errors.push('Size must be at least 0.1');
  if (params.size > 50000) errors.push('Size cannot exceed 50,000');

  // Trail percent limits
  if (params.trailPercent < 0.1) errors.push('Trail percentage must be at least 0.1%');
  if (params.trailPercent > 50) errors.push('Trail percentage cannot exceed 50%');

  // Trigger price
  if (params.triggerPrice !== undefined) {
    if (params.triggerPrice < 0.01) errors.push('Trigger price must be at least 0.01');
    if (params.triggerPrice > 0.99) errors.push('Trigger price cannot exceed 0.99');
  }

  // Warnings
  if (params.trailPercent > 20) warnings.push('Trail percentage is very high (>20%)');

  return { errors, warnings };
}
```

### 11.4 TWAP Validation

```typescript
function validateTWAP(params: TWAPParams): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!params.durationMinutes) errors.push('Duration is required');
  if (!params.intervalMinutes) errors.push('Interval is required');

  // Duration limits
  if (params.durationMinutes < 1) errors.push('Duration must be at least 1 minute');
  if (params.durationMinutes > 1440) errors.push('Duration cannot exceed 24 hours');

  // Interval limits
  if (params.intervalMinutes < 1) errors.push('Interval must be at least 1 minute');
  if (params.intervalMinutes > params.durationMinutes) {
    errors.push('Interval cannot exceed duration');
  }

  // Slice count warnings
  const sliceCount = Math.ceil(params.durationMinutes / params.intervalMinutes);
  if (sliceCount > 100) {
    warnings.push(`High slice count (${sliceCount}). Consider increasing interval.`);
  }

  return { errors, warnings };
}
```

### 11.5 Position Validation

**Behavior**: Validate position exists at order creation time

```typescript
async function validatePositionExists(
  tokenId: string,
  side: 'BUY' | 'SELL',
  size: number
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (side === 'SELL') {
    const position = await getPosition(tokenId);

    if (!position) {
      errors.push('No position found for this token. Cannot create SELL order.');
    } else if (position.size < size) {
      errors.push(`Position size (${position.size}) is less than order size (${size})`);
    }
  }

  return { errors, warnings };
}
```

### 11.6 Multi-Outcome Market Validation

**Behavior**: Different validation rules for multi-outcome vs binary markets

```typescript
interface MarketInfo {
  type: 'BINARY' | 'MULTI_OUTCOME';
  outcomes: string[];
  tokenIds: string[];
}

async function validateMarketType(tokenId: string): Promise<ValidationResult> {
  const marketInfo = await getMarketInfo(tokenId);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (marketInfo.type === 'MULTI_OUTCOME') {
    warnings.push('This is a multi-outcome market. Price validation may differ.');

    // Multi-outcome markets may have different price ranges
    // Sum of all outcome prices typically equals ~1.0
  }

  return { errors, warnings };
}
```

---

## 12. API Integration

### 12.1 Polymarket CLOB API

**Base URL**: `https://gamma-api.polymarket.com`

**Endpoints used**:
- `GET /markets/{tokenId}` - Market info
- `GET /prices/{tokenId}` - Current prices
- `GET /orders` - User's open orders
- `POST /orders` - Place order
- `DELETE /orders/{orderId}` - Cancel order
- `GET /positions` - User positions

### 12.2 Batch Price Fetching

```typescript
interface PriceBatchRequest {
  tokenIds: string[];
}

interface PriceBatchResponse {
  prices: Record<string, PriceData>;
}

async function fetchPricesBatch(tokenIds: string[]): Promise<Record<string, PriceData>> {
  // Deduplicate token IDs
  const uniqueTokenIds = [...new Set(tokenIds)];

  // Batch request (API supports up to 100 tokens)
  const batches = chunk(uniqueTokenIds, 100);
  const results: Record<string, PriceData> = {};

  for (const batch of batches) {
    const response = await fetch(`${API_BASE}/prices/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIds: batch })
    });

    const data: PriceBatchResponse = await response.json();
    Object.assign(results, data.prices);
  }

  return results;
}
```

### 12.3 Order Signing

**Method**: Local signing with Magic Link private key

```typescript
async function signOrder(order: OrderData, privateKey: string): Promise<SignedOrder> {
  const wallet = new ethers.Wallet(privateKey);

  // Create order hash per Polymarket spec
  const orderHash = createOrderHash(order);

  // Sign with EIP-712
  const signature = await wallet._signTypedData(
    POLYMARKET_DOMAIN,
    ORDER_TYPES,
    order
  );

  return {
    ...order,
    signature
  };
}
```

### 12.4 Slippage Estimation

**Display format**: Show with percentage warning

```typescript
interface SlippageEstimate {
  estimatedProceeds: number;
  slippagePercent: number;
  severity: 'low' | 'medium' | 'high';
}

async function estimateSlippage(
  tokenId: string,
  side: 'BUY' | 'SELL',
  size: number
): Promise<SlippageEstimate> {
  const orderbook = await fetchOrderbook(tokenId);

  let filledSize = 0;
  let totalCost = 0;
  const levels = side === 'BUY' ? orderbook.asks : orderbook.bids;

  for (const [price, levelSize] of levels) {
    const fillAtLevel = Math.min(size - filledSize, levelSize);
    totalCost += fillAtLevel * price;
    filledSize += fillAtLevel;

    if (filledSize >= size) break;
  }

  const avgPrice = totalCost / filledSize;
  const midPrice = (orderbook.bestBid + orderbook.bestAsk) / 2;
  const slippagePercent = Math.abs(avgPrice - midPrice) / midPrice * 100;

  return {
    estimatedProceeds: side === 'SELL' ? totalCost : -totalCost,
    slippagePercent,
    severity: slippagePercent < 1 ? 'low' : slippagePercent < 5 ? 'medium' : 'high'
  };
}
```

### 12.5 API Rate Limits

All limits are Cloudflare-throttled; requests over budget are delayed rather than hard-failed.

**General**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| General rate limiting | 15,000 requests / 10s | Throttle requests over max configured rate |
| "OK" health | 100 requests / 10s | Health check |

**Data API**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| Data API (general) | 1,000 requests / 10s | Throttle over max rate |
| `/trades` | 200 requests / 10s | Throttle over max rate |
| `/positions` | 150 requests / 10s | Throttle over max rate |
| `/closed-positions` | 150 requests / 10s | Throttle over max rate |
| Data API "OK" | 100 requests / 10s | Throttle over max rate |

**GAMMA**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| Gamma (general) | 4,000 requests / 10s | Throttle over max rate |
| `GET /events` | 500 requests / 10s | Throttle over max rate |
| `GET /markets` | 300 requests / 10s | Throttle over max rate |
| `GET /markets` events listing | 900 requests / 10s | Throttle over max rate |
| Tags | 200 requests / 10s | Throttle over max rate |
| Search | 350 requests / 10s | Throttle over max rate |

**CLOB (general/auth)**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| CLOB (general) | 9,000 requests / 10s | Throttle over max rate |
| GET balance allowance | 200 requests / 10s | Throttle over max rate |
| UPDATE balance allowance | 50 requests / 10s | Throttle over max rate |
| API keys | 100 requests / 10s | Throttle over max rate |

**CLOB market data**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| `/book` | 1,500 requests / 10s | Throttle over max rate |
| `/books` | 500 requests / 10s | Throttle over max rate |
| `/price` | 1,500 requests / 10s | Throttle over max rate |
| `/prices` | 500 requests / 10s | Throttle over max rate |
| `/midprice` | 1,500 requests / 10s | Throttle over max rate |
| `/midprices` | 500 requests / 10s | Throttle over max rate |

**CLOB ledger**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| `/trades`, `/orders`, `/notifications`, `/order` | 900 requests / 10s | Throttle over max rate |
| `/data/orders` | 500 requests / 10s | Throttle over max rate |
| `/data/trades` | 500 requests / 10s | Throttle over max rate |
| `/notifications` | 125 requests / 10s | Throttle over max rate |

**CLOB markets & pricing**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| Price history | 1,000 requests / 10s | Throttle over max rate |
| Market tick size | 200 requests / 10s | Throttle over max rate |

**CLOB trading**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| POST `/order` | 3,500 requests / 10s (500/s) | Burst |
| POST `/order` | 36,000 requests / 10 minutes (60/s) | Throttle over max rate |
| DELETE `/order` | 3,000 requests / 10s (300/s) | Burst |
| DELETE `/order` | 30,000 requests / 10 minutes (50/s) | Throttle over max rate |
| POST `/orders` | 1,000 requests / 10s (100/s) | Burst |
| POST `/orders` | 15,000 requests / 10 minutes (25/s) | Throttle over max rate |
| DELETE `/orders` | 1,000 requests / 10s (100/s) | Burst |
| DELETE `/orders` | 15,000 requests / 10 minutes (25/s) | Throttle over max rate |
| DELETE `/cancel-all` | 250 requests / 10s (25/s) | Burst |
| DELETE `/cancel-all` | 6,000 requests / 10 minutes (10/s) | Throttle over max rate |
| DELETE `/cancel-market-orders` | 1,000 requests / 10s (100/s) | Burst |
| DELETE `/cancel-market-orders` | 1,500 requests / 10 minutes (25/s) | Throttle over max rate |

**Other**:
| Endpoint | Limit | Notes |
|----------|-------|-------|
| Relayer `/submit` | 25 requests / 1 minute | Throttle over max rate |
| User PNL API | 200 requests / 10s | Throttle over max rate |

**Throttling behavior**:
- Per-endpoint token bucket tuned to the 10s/10min windows; queue and delay rather than drop.
- Prioritize price fetches by trigger proximity; downgrade UI polling before order-critical calls.
- When throttled, back off with exponential delay and surface "degraded due to rate limit" status in UI/logs.

---

## 13. Extension Lifecycle

### 13.1 Installation

```typescript
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First install
    await initializeStorage();
    console.log('[Extension] Installed successfully');
  } else if (details.reason === 'update') {
    // Extension updated
    await runMigrations(details.previousVersion);
    console.log(`[Extension] Updated from ${details.previousVersion}`);
  }
});
```

### 13.2 Update Migration

**Behavior**: Validate orders, auto-resume valid ones

```typescript
interface Migration {
  version: string;
  migrate: () => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: '1.1.0',
    migrate: async () => {
      // Example: Add new field to orders
      const { algo_orders } = await chrome.storage.local.get('algo_orders');
      const updated = algo_orders.map(order => ({
        ...order,
        newField: order.newField ?? 'default'
      }));
      await chrome.storage.local.set({ algo_orders: updated });
    }
  }
];

async function runMigrations(fromVersion: string): Promise<void> {
  const pendingMigrations = migrations.filter(m =>
    semver.gt(m.version, fromVersion)
  );

  for (const migration of pendingMigrations) {
    console.log(`[Migration] Running migration for ${migration.version}`);
    await migration.migrate();
  }

  // Validate all orders after migration
  await validateAllOrders();
}

async function validateAllOrders(): Promise<void> {
  const { algo_orders } = await chrome.storage.local.get('algo_orders');

  for (const order of algo_orders) {
    if (order.status === 'ACTIVE') {
      const validation = validateOrder(order);

      if (validation.errors.length > 0) {
        // Invalid order - pause and notify
        order.status = 'PAUSED';
        order.lastError = `Migration validation failed: ${validation.errors.join(', ')}`;
        notify(
          'Order Requires Review',
          `Order ${order.id.slice(0, 8)}... paused after update. Please review.`,
          'info'
        );
      }
    }
  }

  await chrome.storage.local.set({ algo_orders });
}
```

**Versioning and failure handling**:
- Migration versions track extension semver (starting from 1.0.0). Only migrations with `version > fromVersion` run.
- On migration failure: abort, log error, notify user, and pause monitoring until manual retry.
- After successful migrations, revalidate active orders and surface any paused orders to the user.

### 13.3 Debug Mode

**Behavior**: Toggle in settings, verbose logging

```typescript
interface DebugLogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private debugMode: boolean = false;
  private logs: DebugLogEntry[] = [];
  private maxLogs: number = 1000;

  async init(): Promise<void> {
    const { debug_mode } = await chrome.storage.local.get('debug_mode');
    this.debugMode = debug_mode ?? false;
  }

  log(level: DebugLogEntry['level'], category: string, message: string, data?: any): void {
    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };

    // Always log errors
    if (level === 'error' || this.debugMode) {
      console.log(`[${category}] ${message}`, data ?? '');

      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    }
  }

  async exportLogs(): Promise<string> {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
```

### 13.4 Monitoring Heartbeat

- Use `chrome.alarms` heartbeat (every 15–30 minutes) to keep the service worker active.
- Accept worst-case MV3 wake latency of up to **8 hours**; on wake, immediately evaluate all active orders, run TWAP catch-up, and recalculate polling intervals.
- If heartbeat misses beyond expected window, log a warning and trigger full catch-up cycle on next wake.

---

## 14. Future Enhancements

The following features are explicitly out of scope for MVP but noted for future consideration:

### 14.1 Data Export (CSV/JSON)
- Export order history for tax reporting
- Export execution data for portfolio analysis
- Backup/restore functionality

### 14.2 Order Templates
- Save custom order configurations
- Quick-apply presets for common strategies
- Share templates between devices

### 14.3 Breakeven Stop Feature
- Automatically move stop to entry price after X% profit
- Separate order type or enhancement to trailing stop

### 14.4 Paper Trading Mode
- Full simulation without real execution
- Strategy testing and validation

### 14.5 Hardware Wallet Support
- Ledger/Trezor integration via WebHID
- External signer (EIP-1193) support

---

## 15. Technical Requirements

### 15.1 Browser Support

- **Chrome**: Version 88+ (Manifest V3 support)
- **Edge**: Version 88+ (Chromium-based)
- **Other browsers**: Not supported

### 15.2 Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "ethers": "^5.7.0",
    "@polymarket/clob-client": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "webpack": "^5.88.0",
    "ts-loader": "^9.4.0"
  }
}
```

### 15.3 TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  }
}
```

### 15.4 Build Output

- **Content script**: ~35 KiB gzipped
- **Service worker**: ~25 KiB gzipped
- **Popup**: ~15 KiB gzipped
- **Total extension size**: <500 KiB

### 15.5 Performance Targets

| Metric | Target |
|--------|--------|
| Service worker memory | < 50 MB |
| Content script memory | < 30 MB |
| Idle CPU usage | < 1% |
| Price fetch latency | < 500ms |
| Order execution latency | < 2s |

---

## Appendix A: Message Protocol

### Content Script → Service Worker

```typescript
// CREATE_ALGO_ORDER
interface CreateOrderMessage {
  type: 'CREATE_ALGO_ORDER';
  order: AlgoOrderParams;
}
// Response: { success: boolean; orderId?: string; error?: string }

// PAUSE_ALGO_ORDER
interface PauseOrderMessage {
  type: 'PAUSE_ALGO_ORDER';
  orderId: string;
}
// Response: { success: boolean }

// RESUME_ALGO_ORDER
interface ResumeOrderMessage {
  type: 'RESUME_ALGO_ORDER';
  orderId: string;
}
// Response: { success: boolean }

// CANCEL_ALGO_ORDER
interface CancelOrderMessage {
  type: 'CANCEL_ALGO_ORDER';
  orderId: string;
}
// Response: { success: boolean }

// GET_ORDERS
interface GetOrdersMessage {
  type: 'GET_ORDERS';
  filter?: { status?: OrderStatus[] };
}
// Response: { orders: AlgoOrder[] }

// GET_POSITIONS
interface GetPositionsMessage {
  type: 'GET_POSITIONS';
}
// Response: { positions: Position[] }
```

---

## Appendix B: Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `E001` | Invalid private key format | Check key starts with 0x |
| `E002` | Decryption failed | Verify password is correct |
| `E003` | Insufficient USDC balance | Add funds or reduce order size |
| `E004` | Insufficient token balance | Check position or reduce size |
| `E005` | Order validation failed | Review order parameters |
| `E006` | API rate limited | Wait and retry |
| `E007` | Network error | Check connection |
| `E008` | Market not found | Verify token ID |
| `E009` | Order execution failed | Check logs for details |
| `E010` | Extension context invalidated | Refresh page |

---

*End of Specification*
