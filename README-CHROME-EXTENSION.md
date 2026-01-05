# Polymarket Algorithmic Trading Chrome Extension

A Chrome extension that brings algorithmic trading capabilities to Polymarket, featuring trailing stops, stop-loss/take-profit orders, and TWAP (Time-Weighted Average Price) execution. Built following twelve-factor methodology principles.

Note: Remote signing via Cloudflare Workers has been removed; the extension now signs locally with the Magic Link private key.

## Project Structure

This is a monorepo containing:

```
.
├── chrome-extension/          # Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── background/       # Service worker for 24/7 market monitoring
│   │   ├── content/          # Content scripts injected into polymarket.com
│   │   ├── popup/            # Extension popup and settings UI
│   │   ├── shared/           # Shared code (hooks, providers, utils)
│   │   ├── storage/          # Storage abstraction and encryption
│   │   └── algo/             # Algorithmic order logic
│   ├── manifest.json
│   ├── webpack.config.js
│   └── package.json
│
└── package-workspaces.json   # Root workspace configuration
```

## Features

### Algorithmic Order Types
1. **Trailing Stop Orders** - Automatically adjusts stop price as market moves favorably
2. **Stop-Loss / Take-Profit** - Auto-close positions at predetermined price levels
3. **TWAP Orders** - Distribute large orders over time to minimize market impact

### Technical Features
- **24/7 Market Monitoring** - Service worker continuously monitors markets
- **Secure Key Storage** - Private keys encrypted with AES-256-GCM
- **Twelve-Factor Compliant** - Follows best practices for config, dependencies, and deployment
- **Content Script Injection** - Seamlessly integrates with polymarket.com

## Setup Instructions

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Or install individually
cd chrome-extension && npm install
```

### 2. Build Extension

```bash
cd chrome-extension

# Development build (with source maps and watch mode)
npm run dev

# Production build
npm run build
```

The build output will be in `chrome-extension/build/`.

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `chrome-extension/build/` directory
5. The extension should now appear in your extensions list

### 4. Using the Extension

1. Visit https://polymarket.com
2. Click the extension icon or see the injected panel on the page
3. Enter your Magic Link private key (securely encrypted with password)
4. Initialize trading session (API credentials, approvals)
5. Create algorithmic orders!

## User Guide

### Unlocking Your Wallet

When you first visit Polymarket with the extension installed, you'll see the Algo Trading panel:

1. **Enter Magic Link Private Key** - Your Magic Link EOA private key (starts with `0x`)
2. **Create Password** - A strong password to encrypt your key (8+ characters recommended)
3. **Click "Unlock Wallet"** - Your key will be encrypted with AES-256-GCM and stored securely

**Security Notes:**
- Your private key is encrypted before storage and never transmitted
- The password is never stored - you'll need to re-enter it on each session
- Locking the wallet clears all sensitive data from memory

### Creating Algorithmic Orders

Once your wallet is unlocked, click **"+ Create Algo Order"** to open the order form.

#### Order Form Fields

**Required Fields (all order types):**
- **Order Type** - Select from Trailing Stop, Stop-Loss/Take-Profit, or TWAP
- **Market Token ID** - The token ID from the Polymarket market you want to trade
  - Find this in the URL: `polymarket.com/event/...?tid=TOKENID`
- **Side** - Choose "Buy YES" or "Sell NO"
- **Size** - Number of shares to trade (0.01 to 100,000)

#### Trailing Stop Orders

Automatically follows price movements and triggers when price reverses by a specified percentage.

**Additional Fields:**
- **Trail Percentage** (required) - How far price can reverse before triggering (0.1% to 50%)
  - Example: 5% means order triggers if price drops 5% from the highest point
- **Trigger Price** (optional) - Only activate trailing after price reaches this level
  - Example: Set to 0.70 to only start trailing after price reaches 70¢

**Use Cases:**
- Lock in profits as price moves favorably
- Protect against sudden reversals
- Let winners run while limiting downside

#### Stop-Loss / Take-Profit Orders

Automatically close positions when price reaches predetermined levels.

**Additional Fields:**
- **Stop-Loss Price** (optional) - Exit if price falls to this level (0.01 to 0.99)
  - Example: Set to 0.30 to exit if price drops to 30¢
- **Take-Profit Price** (optional) - Exit if price rises to this level (0.01 to 0.99)
  - Example: Set to 0.80 to take profit at 80¢

**Notes:**
- At least one price must be specified (stop-loss OR take-profit)
- Both can be set to create a bracket order
- Validation ensures stop-loss < take-profit for BUY orders

**Use Cases:**
- Risk management (cap losses with stop-loss)
- Profit taking (lock in gains at target price)
- Set-and-forget position management

#### TWAP Orders

Distribute large orders over time to minimize market impact and achieve better average prices.

**Additional Fields:**
- **Duration (minutes)** (required) - Total time to execute order over (1 to 1,440 minutes / 24 hours)
  - Example: 60 minutes to execute over one hour
- **Interval (minutes)** (required) - Time between each order slice (1 to duration)
  - Example: 5 minutes to place orders every 5 minutes

**Order Slicing:**
- Total size is divided into equal slices
- Number of slices = Duration ÷ Interval
- Each slice executes at market price
- Remaining size adjusted after each fill

**Example:**
```
Size: 1000 shares
Duration: 60 minutes
Interval: 5 minutes
→ 12 slices of ~83 shares each
→ Orders placed at: 0m, 5m, 10m, 15m, ..., 55m, 60m
```

**Use Cases:**
- Execute large orders without moving the market
- Achieve better average price than market order
- Reduce slippage on illiquid markets

### Real-Time Validation

The order form validates your inputs in real-time and shows errors or warnings:

**Errors (must be fixed):**
- ❌ Missing required fields
- ❌ Invalid ranges (e.g., price > 0.99)
- ❌ Logical conflicts (e.g., stop-loss above take-profit)
- ❌ Invalid TWAP configuration (e.g., interval > duration)

**Warnings (can proceed):**
- ⚠️ Very small sizes (< 1 share)
- ⚠️ Very large sizes (> 10,000 shares)
- ⚠️ Extreme trail percentages
- ⚠️ TWAP with too many slices (> 100)

The "Create Order" button is disabled until all errors are resolved.

### Order Preview

After clicking "Create Order" with valid inputs, a preview modal appears:

**Preview Shows:**
- Order type and side (with color coding)
- Market token ID
- Size and all parameters
- TWAP slice calculation (if applicable)
- All trigger conditions

**Actions:**
- **Confirm & Create** - Submit the order to the service worker
- **Cancel** - Return to form to make changes

This gives you a final chance to review before creating the order.

### Order Execution

After confirming, the order is created and monitored by the service worker:

**During Creation:**
- Loading spinner appears with "Creating order..." message
- Form is disabled to prevent duplicate submissions

**After Creation:**
- ✅ Success message: "Order created successfully!"
- Order appears in "Active Orders" list
- Form closes automatically
- Service worker begins monitoring

**If Error:**
- ❌ Error message with reason
- Form remains open for corrections
- You can try again

### Managing Active Orders

Active orders appear in the "Active Orders" section with real-time status:

**Order Card Shows:**
- Order type badge (color-coded)
- Market token ID
- Side (BUY/SELL) and size
- Current status (ACTIVE/PAUSED)
- All parameters and conditions
- Execution progress (for TWAP)

**Actions:**
- **⏸ Pause** - Temporarily stop monitoring (status → PAUSED)
- **▶ Resume** - Resume monitoring (status → ACTIVE)
- **✕ Cancel** - Permanently cancel order (requires confirmation)

**Order Status:**
- **ACTIVE** - Being monitored, will execute when conditions met
- **PAUSED** - Not being monitored, will not execute
- **COMPLETED** - Fully executed (moved to history)
- **CANCELLED** - Manually cancelled (moved to history)
- **FAILED** - Execution failed (moved to history with error)

### Order History

The "Order History" section (below active orders) shows completed and cancelled orders:

**Collapsible Panel:**
- Click to expand/collapse
- Shows count of completed/cancelled orders

**History Card Shows:**
- Order type, side, size
- Final status (COMPLETED/CANCELLED/FAILED)
- Creation and completion timestamps
- Average execution price (for completed orders)
- Total fills and execution count
- Execution history (if available)

**TWAP History:**
- Shows progress (e.g., "8/12 slices executed")
- Lists each slice execution with price and timestamp

### Service Worker Monitoring

The service worker runs in the background (even when Polymarket tab is closed):

**Monitoring Frequency:**
- Checks markets every 30 seconds
- Evaluates all active orders against current prices
- Executes orders when conditions are met

**What It Does:**
1. Fetches current market prices from Polymarket
2. Evaluates each active order's conditions
3. Executes trades when conditions trigger
4. Updates order status and execution history
5. Shows browser notifications for completions

**Persistence:**
- All orders stored in chrome.storage.local
- Survives browser restarts
- Independent of Polymarket tab state

### Troubleshooting

#### Extension Context Invalidated

**Error:** "Extension context invalidated. Please reload this page."

**Cause:** Extension was reloaded/updated while page was open

**Fix:**
1. Reload the Polymarket page (⌘R / Ctrl+R)
2. Panel will reinitialize with fresh extension context
3. Your orders are still safe in storage

#### No Panel Visible

**Possible Causes:**
- Extension not loaded in chrome://extensions/
- Content script injection failed
- Page loaded before extension

**Fix:**
1. Check extension is enabled in chrome://extensions/
2. Reload the Polymarket page
3. Check browser console for errors

#### Orders Not Executing

**Check:**
1. Order status is ACTIVE (not PAUSED)
2. Service worker is running (check chrome://extensions/ → service worker)
3. Conditions are actually met (check current market price)
4. Wallet has sufficient balance
5. Market has sufficient liquidity

**Debug:**
1. Open background service worker console
2. Look for "Evaluating orders..." logs every 30 seconds
3. Check for execution errors

#### Validation Errors

**Common Issues:**
- Token ID not found → Copy from Polymarket URL
- Price out of range → Must be between 0.01 and 0.99
- Stop-loss above take-profit → Check order side and prices
- TWAP interval > duration → Reduce interval or increase duration

#### Poor Execution Prices

**For Market Orders:**
- Check order size vs market liquidity
- Consider using TWAP for large orders

**For TWAP:**
- Increase duration for better average price
- Decrease interval for more fills (more gas fees)
- Check market volatility

### Best Practices

**Security:**
- Use strong passwords (8+ characters, mixed case, numbers, symbols)
- Lock wallet when done trading
- Never share your private key or password
- Only install extension from trusted sources
- Verify worker URL matches your deployment

**Order Management:**
- Start with small sizes to test
- Use preview modal to double-check parameters
- Monitor first few executions to verify behavior
- Set reasonable trail percentages (2-10% typical)
- Use TWAP for orders > 5% of market liquidity

**Performance:**
- Keep number of active orders reasonable (< 20)
- Cancel completed orders to reduce storage
- Clear order history periodically
- Check service worker logs for issues

**Risk Management:**
- Always set stop-losses for downside protection
- Use trailing stops to lock in profits
- Don't over-leverage with large sizes
- Understand market liquidity before trading
- Test with small amounts first

## Development Workflow

### Working on Extension
```bash
cd chrome-extension
npm run dev  # Watches for changes and rebuilds
```

After making changes, click the reload icon in `chrome://extensions/` to reload the extension.

### Working on Worker
```bash
cd serverless/cloudflare-worker
npm run dev  # Runs local development server
```

### Type Checking
```bash
# Check all workspaces
npm run type-check

# Check individual workspace
cd chrome-extension && npm run type-check
```

## Technical Reference

### Component Architecture

**Content Script Components** (`chrome-extension/src/content/ui/`)

- **`AlgoTradingPanel.tsx`** - Main panel container
  - Manages panel state (expanded/collapsed)
  - Renders WalletUnlock or trading interface
  - Handles order creation, pause, resume, cancel
  - Shows loading overlay during operations
  - Location: Injected into polymarket.com pages

- **`WalletUnlock.tsx`** - Wallet unlock UI
  - Private key and password input
  - Encryption with AES-256-GCM
  - Stores encrypted key in chrome.storage.local
  - Validates key format (0x... hex)

- **`AlgoOrderForm.tsx`** - Order creation form
  - Dynamic form fields based on order type
  - Real-time validation with errors/warnings
  - Preview modal integration
  - Builds order data from form state

- **`OrderValidation.tsx`** - Validation logic
  - Validates all order parameters
  - Returns errors (blocking) and warnings (non-blocking)
  - Type-specific validation rules
  - Logical constraint validation (e.g., stop-loss < take-profit)

- **`OrderPreview.tsx`** - Order preview modal
  - Shows all order parameters before creation
  - Color-coded by order type
  - TWAP slice calculation
  - Confirm/cancel actions

- **`ActiveOrdersList.tsx`** - Active orders display
  - Shows ACTIVE and PAUSED orders
  - Pause/resume/cancel controls
  - Real-time status updates
  - Type-specific parameter display

- **`OrderHistory.tsx`** - Order history display
  - Shows COMPLETED, CANCELLED, FAILED orders
  - Collapsible panel
  - Execution details and average price
  - TWAP slice progress

- **`LoadingSpinner.tsx`** - Loading indicator
  - Reusable spinner component
  - Configurable sizes (small/medium/large)
  - Optional message display
  - CSS keyframe animation

**Service Worker Components** (`chrome-extension/src/background/`)

- **`index.ts`** - Service worker entry point
  - Initializes chrome.alarms for monitoring
  - Listens for messages from content script
  - Handles CREATE/PAUSE/RESUME/CANCEL actions
  - Manages order state in storage

- **`AlgoEngine.ts`** - Algorithmic order engine
  - Evaluates order conditions against market prices
  - Triggers order execution when conditions met
  - Handles TRAILING_STOP, STOP_LOSS, TAKE_PROFIT, TWAP
  - Updates order state and execution history

- **`OrderManager.ts`** - Order state management
  - CRUD operations for orders
  - Persists to chrome.storage.local
  - Loads orders on startup
  - Filters by status (ACTIVE/PAUSED/etc.)

**Shared Components** (`chrome-extension/src/shared/`)

- **`providers/WalletProvider.tsx`** - Wallet state management
  - React context for wallet state
  - Unlock/lock functionality
  - Encrypted storage integration
  - EOA address management

- **`providers/TradingProvider.tsx`** - Trading state management
  - React context for trading state
  - Session initialization
  - ClobClient integration
  - Order execution helpers

- **`storage/encryption.ts`** - Encryption utilities
  - AES-256-GCM encryption/decryption
  - PBKDF2 key derivation (100,000 iterations)
  - Salt and IV generation
  - Secure key storage

- **`types/index.ts`** - TypeScript type definitions
  - AlgoOrderType: 'TRAILING_STOP' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TWAP'
  - OrderStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
  - AlgoOrder interface
  - ExecutionHistory interface

### Data Flow Diagrams

**Order Creation Flow:**
```
User fills form → Validation → Preview modal → Confirm
                                                    ↓
AlgoOrderForm → chrome.runtime.sendMessage → Service Worker
                                                    ↓
                                              OrderManager.create()
                                                    ↓
                                              chrome.storage.local
                                                    ↓
                                              AlgoEngine monitors
```

**Order Execution Flow:**
```
chrome.alarms (every 30s) → AlgoEngine.evaluate()
                                    ↓
                            Fetch market prices
                                    ↓
                            Check order conditions
                                    ↓
                            Condition met? → Execute trade
                                                    ↓
                                              Update order status
                                                    ↓
                                              chrome.storage.local
                                                    ↓
                                              Browser notification
```

**Storage Schema:**

```typescript
// chrome.storage.local keys
{
  "encrypted_private_key": string,        // AES-256-GCM encrypted private key
  "wallet_address": string,               // EOA address (0x...)
  "algo_orders": AlgoOrder[],            // All orders (active + history)
  "execution_history": ExecutionHistory[] // Fill history
}

// AlgoOrder interface
interface AlgoOrder {
  id: string;                    // UUID
  type: AlgoOrderType;           // Order type
  tokenId: string;               // Market token ID
  side: 'BUY' | 'SELL';         // Order side
  size: number;                  // Shares to trade
  status: OrderStatus;           // Current status
  createdAt: number;            // Timestamp
  updatedAt: number;            // Timestamp
  completedAt?: number;         // Timestamp (if completed)

  // Type-specific params
  trailPercent?: number;        // Trailing stop %
  triggerPrice?: number;        // Activation price
  stopLossPrice?: number;       // Stop-loss price
  takeProfitPrice?: number;     // Take-profit price
  durationMinutes?: number;     // TWAP duration
  intervalMinutes?: number;     // TWAP interval

  // Execution tracking
  executionHistory: Array<{
    timestamp: number;
    price: number;
    size: number;
    fillId?: string;
  }>;

  // TWAP state
  lastExecutedAt?: number;      // Last slice timestamp
  remainingSize?: number;       // Unfilled size
}
```

### Message Protocol

Content script ↔ Service worker communication via `chrome.runtime.sendMessage`:

```typescript
// CREATE_ALGO_ORDER
{
  type: 'CREATE_ALGO_ORDER',
  order: AlgoOrderFormData
}
→ Response: { success: boolean, orderId?: string, error?: string }

// PAUSE_ALGO_ORDER
{
  type: 'PAUSE_ALGO_ORDER',
  orderId: string
}
→ Response: { success: boolean }

// RESUME_ALGO_ORDER
{
  type: 'RESUME_ALGO_ORDER',
  orderId: string
}
→ Response: { success: boolean }

// CANCEL_ALGO_ORDER
{
  type: 'CANCEL_ALGO_ORDER',
  orderId: string
}
→ Response: { success: boolean }
```

### Algorithm Implementation Details

**Trailing Stop Logic** (`chrome-extension/src/background/AlgoEngine.ts:evaluateTrailingStop`)

```typescript
// Track highest price since activation
if (currentPrice > order.highestPrice) {
  order.highestPrice = currentPrice;
}

// Calculate trail threshold
const trailAmount = order.highestPrice * (order.trailPercent / 100);
const stopPrice = order.highestPrice - trailAmount;

// Trigger if price drops below trail threshold
if (currentPrice <= stopPrice) {
  executeOrder(order);
}
```

**Stop-Loss/Take-Profit Logic** (`chrome-extension/src/background/AlgoEngine.ts:evaluateStopLoss`)

```typescript
// Check stop-loss condition
if (order.stopLossPrice && currentPrice <= order.stopLossPrice) {
  executeOrder(order, 'stop-loss');
}

// Check take-profit condition
if (order.takeProfitPrice && currentPrice >= order.takeProfitPrice) {
  executeOrder(order, 'take-profit');
}
```

**TWAP Logic** (`chrome-extension/src/background/AlgoEngine.ts:evaluateTWAP`)

```typescript
// Check if interval elapsed since last execution
const timeSinceLastExecution = Date.now() - order.lastExecutedAt;
const intervalMs = order.intervalMinutes * 60 * 1000;

if (timeSinceLastExecution >= intervalMs) {
  // Calculate slice size
  const remainingIntervals = Math.ceil(
    (order.durationMinutes * 60 * 1000 - elapsedTime) / intervalMs
  );
  const sliceSize = order.remainingSize / remainingIntervals;

  // Execute slice
  executeSlice(order, sliceSize);

  // Update state
  order.lastExecutedAt = Date.now();
  order.remainingSize -= sliceSize;
}
```

### Security Implementation

**Private Key Encryption:**

```typescript
// Encryption (storage/encryption.ts)
1. Derive key from password using PBKDF2 (100k iterations, SHA-256)
2. Generate random salt (16 bytes) and IV (12 bytes)
3. Encrypt private key using AES-256-GCM
4. Store: salt + IV + ciphertext + auth tag (base64)

// Decryption
1. Parse stored data → extract salt, IV, ciphertext
2. Derive key from password using same PBKDF2 params + salt
3. Decrypt using AES-256-GCM
4. Verify auth tag (prevents tampering)
5. Return plaintext private key
```

**No Transmission:**
- Private key never sent over network
- All signing done locally in browser
- Only signed messages sent to blockchain
- Worker URL only for builder credential signing (separate keys)

### Performance Considerations

**Service Worker:**
- Runs persistently in background
- Monitoring interval: 30 seconds (configurable)
- Batches price fetches for all active orders
- Minimal memory footprint (<10MB typical)

**Storage:**
- chrome.storage.local limit: 10MB
- Typical order size: ~500 bytes
- Max ~20,000 orders before limit (unrealistic)
- Order history can be cleared to free space

**Content Script:**
- Injected only on polymarket.com
- Bundle size: ~33.4 KiB (gzipped)
- React + providers: minimal overhead
- No impact on page load performance

### Build System

**Webpack Configuration** (`chrome-extension/webpack.config.js`)

- **Entry Points:**
  - `content/inject.tsx` → Content script bundle
  - `background/index.ts` → Service worker bundle
  - `popup/index.tsx` → Popup bundle (planned)

- **TypeScript:**
  - ts-loader with tsconfig.json
  - Strict mode enabled
  - Type checking during build

- **Production Optimizations:**
  - Minification (Terser)
  - Tree shaking
  - Source maps (dev only)
  - Bundle analysis available

- **Dev Mode:**
  - Watch mode for auto-rebuild
  - Faster builds (no minification)
  - Source maps enabled

## Architecture Overview

### Twelve-Factor Methodology

| Factor | Implementation |
|--------|---------------|
| **I. Codebase** | Single repo with workspaces for extension and serverless |
| **II. Dependencies** | Explicit in package.json with lock files |
| **III. Config** | manifest.json + Cloudflare secrets + options page |
| **IV. Backing Services** | Polymarket APIs, Polygon RPC, signing service as resources |
| **V. Build/Release/Run** | Webpack builds → versioned releases → load unpacked/store |
| **VI. Processes** | Service worker stateless, uses chrome.storage for state |
| **VII. Port Binding** | N/A for extension, Worker exposes HTTPS endpoints |
| **VIII. Concurrency** | chrome.alarms for market monitoring, parallel algo execution |
| **IX. Disposability** | Fast startup, graceful shutdown, persistent state |
| **X. Dev/Prod Parity** | Same code, different config (dev/prod worker URLs) |
| **XI. Logs** | Console logs → chrome.storage, accessible via devtools |
| **XII. Admin Processes** | Options page for settings, session management |

### Data Flow

```
User (polymarket.com)
    ↓
Content Script (inject.tsx)
    ↓
WalletProvider (encrypted storage) → TradingProvider (session)
    ↓                                           ↓
Service Worker (background monitoring)    ClobClient (orders)
    ↓                                           ↓
AlgoEngine (evaluate conditions)          Cloudflare Worker (signing)
    ↓                                           ↓
Execute Orders ──────────────────────────> Polymarket CLOB
```

## Security Considerations

### Private Key Protection
- **Never stored in plaintext** - Always encrypted with AES-256-GCM
- **Password-based encryption** - Uses PBKDF2 with 100,000 iterations
- **No transmission** - Private key never leaves your browser
- **Clear on exit** - Sensitive data cleared from memory when possible

### Builder Credentials
- **Server-side only** - Stored in Cloudflare Worker secrets
- **Never in extension** - Extension cannot access builder credentials
- **CORS protected** - Worker only accepts requests from extension origin

### Best Practices
- Use a strong password (8+ characters, letters + numbers)
- Only use on trusted devices
- Clear session data when done trading
- Review permissions before installing

## Current Status

### ✅ Completed
- [x] **Phase 1: Infrastructure**
  - [x] Project structure with npm workspaces
  - [x] Cloudflare Worker signing service
  - [x] Chrome extension manifest and build system (Manifest V3)
  - [x] Storage abstraction layer (chrome.storage)
  - [x] Private key encryption module (AES-256-GCM)
  - [x] Session management adapter
  - [x] Content script styles

- [x] **Phase 2: UI Foundation**
  - [x] Core providers (WalletProvider, TradingProvider)
  - [x] Content script injection (AlgoTradingPanel)
  - [x] Wallet unlock UI with encryption
  - [x] Order creation form (AlgoOrderForm)
  - [x] Active orders list with controls
  - [x] Responsive panel design

- [x] **Phase 3: Service Worker & Algo Engine**
  - [x] Service worker lifecycle management
  - [x] Market monitoring system (chrome.alarms)
  - [x] Algorithmic order engine (AlgoEngine)
  - [x] Order manager with state persistence
  - [x] Real-time price tracking
  - [x] Order execution logic

- [x] **Phase 4: Algorithm Implementations**
  - [x] Trailing stop orders
  - [x] Stop-loss/take-profit orders
  - [x] TWAP (Time-Weighted Average Price) orders
  - [x] Condition evaluation system
  - [x] Automatic order execution
  - [x] Fill tracking and history

- [x] **Phase 5: Polish & UX Enhancements**
  - [x] Real-time order validation with errors/warnings
  - [x] Order preview modal before creation
  - [x] Loading states and spinner component
  - [x] Success/error feedback alerts
  - [x] Order history view with execution details
  - [x] Responsive error handling
  - [x] Extension context invalidation handling

### 📋 Remaining Tasks
- [ ] Extension popup UI
- [ ] Settings/options page (worker URL configuration)
- [ ] Notification preferences
- [ ] Unit tests for algo logic
- [ ] Integration tests
- [ ] Security audit
- [ ] Performance optimization
- [ ] Chrome Web Store submission

## Testing the Extension

### Manual Testing Checklist

**Wallet Unlock Flow:**
- [ ] Enter private key and password → wallet unlocks successfully
- [ ] Invalid private key → shows error
- [ ] Weak password → shows warning
- [ ] Lock wallet → clears sensitive data
- [ ] Reload page → requires re-unlock (password not persisted)

**Order Creation - Trailing Stop:**
- [ ] Create with valid params → preview modal appears
- [ ] Confirm preview → order created and appears in active list
- [ ] Create with invalid trail % → validation error shown
- [ ] Create without token ID → validation error shown
- [ ] Loading spinner appears during creation

**Order Creation - Stop-Loss/Take-Profit:**
- [ ] Create with only stop-loss → succeeds
- [ ] Create with only take-profit → succeeds
- [ ] Create with both → succeeds
- [ ] Create with neither → validation error
- [ ] Stop-loss > take-profit on BUY → validation error
- [ ] Preview shows correct parameters

**Order Creation - TWAP:**
- [ ] Create with valid duration/interval → succeeds
- [ ] Create with interval > duration → validation error
- [ ] Preview shows correct slice count
- [ ] Very long duration → warning about many slices

**Order Management:**
- [ ] Pause active order → status changes to PAUSED
- [ ] Resume paused order → status changes to ACTIVE
- [ ] Cancel order → confirmation prompt appears
- [ ] Confirm cancel → order removed from active list
- [ ] Active orders persist after page reload

**Order Execution (requires real market):**
- [ ] Trailing stop triggers when price reverses
- [ ] Stop-loss executes at correct price
- [ ] Take-profit executes at correct price
- [ ] TWAP slices execute at intervals
- [ ] Completed orders move to history

**Order History:**
- [ ] Completed orders shown with execution details
- [ ] Cancelled orders shown with timestamp
- [ ] Average price calculated correctly
- [ ] TWAP shows slice progress
- [ ] History persists after page reload

**Error Handling:**
- [ ] Extension reload → shows context invalidation error
- [ ] Reload page after extension reload → panel works again
- [ ] Network error during creation → error message shown
- [ ] Service worker crash → orders still in storage

### Automated Testing (Future)

Tests to be added:

**Unit Tests:**
- Order validation logic (OrderValidation.tsx)
- AlgoEngine condition evaluation
- TWAP slice calculation
- Price comparison logic
- Encryption/decryption

**Integration Tests:**
- Wallet unlock → order creation → execution flow
- Service worker order monitoring
- Storage persistence
- Message passing between content script and background

**E2E Tests:**
- Full user journey: unlock → create order → manage → execute
- Multi-order scenarios
- Error recovery flows

## Contributing

This project is currently in active development. Contributions welcome after initial release.

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-repo/issues
- Documentation: See plan file at `.claude/plans/partitioned-crafting-pearl.md`

## Acknowledgments

- Polymarket for the trading SDKs
- Cloudflare Workers for serverless infrastructure
- Chrome Extension team for Manifest V3 documentation
