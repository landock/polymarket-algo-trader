# Chrome Extension Testing Guide

## Manual Testing in Chrome

### 1. Load the Extension

1. **Open Chrome Extensions page:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

2. **Load the unpacked extension:**
   - Click "Load unpacked"
   - Select the `/chrome-extension/build/` directory
   - The extension should now appear in your extensions list

3. **Pin the extension:**
   - Click the puzzle icon in Chrome toolbar
   - Pin "Polymarket Algo Trader" for easy access

### 2. Test Core Features

#### A. Extension Installation & Service Worker
- [ ] Extension icon appears in Chrome toolbar
- [ ] Click extension icon - popup should open
- [ ] Check Chrome DevTools > Service Workers to verify it's running
- [ ] No console errors in service worker

#### B. Wallet Initialization
1. Go to `polymarket.com`
2. Open the extension popup
3. Enter a test private key (or use settings to import)
4. Verify:
   - [ ] Wallet address is displayed
   - [ ] Proxy address is calculated correctly
   - [ ] No errors in console

#### C. Order Validation (NEW FEATURE)
1. Try to place an order with invalid parameters:
   - [ ] Size too small (< 0.01) - should show validation error
   - [ ] Size too large (> 1,000,000) - should show validation error
   - [ ] Price out of range (< 0.0001 or > 0.9999) - should show validation error
   - [ ] Order value too small (< $1) - should show validation error

2. Try to place an order with insufficient balance:
   - [ ] BUY order when USDC balance is too low - should show balance error
   - [ ] SELL order when token balance is too low - should show balance error

#### D. Retry Logic (NEW FEATURE)
1. Simulate network issues:
   - Disconnect internet temporarily
   - Try to fetch orders
   - Verify:
     - [ ] Retry attempts are logged in console
     - [ ] Exponential backoff is applied
     - [ ] Error message is shown after max retries

2. Reconnect and verify:
   - [ ] Next fetch succeeds
   - [ ] Data loads correctly

#### E. Market Price Fetching (NEW FEATURE)
1. Open DevTools Console (background service worker)
2. Create an algo order
3. Verify in console logs:
   - [ ] `[MarketMonitor] Fetching prices for X tokens using batch API`
   - [ ] Prices fetched in parallel for multiple tokens
   - [ ] Price logs show bid/ask/mid correctly

#### F. Extension Context Invalidation Handling (NEW FIX)
1. With extension popup open and data loaded:
   - Reload the extension (chrome://extensions/)
   - Don't refresh the Polymarket page
2. Verify:
   - [ ] Auto-refresh stops automatically
   - [ ] Error message: "Extension was reloaded. Please refresh this page."
   - [ ] No repeated error messages in console
   - [ ] Refresh the page - extension works again

#### G. Message Channel Error Handling (NEW FIX)
1. Place multiple rapid requests (e.g., refresh positions quickly)
2. Verify:
   - [ ] No "message channel closed" errors
   - [ ] All responses complete successfully
   - [ ] No race conditions

### 3. Test on Polymarket.com

#### Prerequisites
- Have a Polymarket account with some test funds
- Private key imported into extension

#### Test Scenarios

**Scenario 1: View Positions**
1. Navigate to polymarket.com
2. Load positions in extension
3. Verify:
   - [ ] Positions load and display correctly
   - [ ] Auto-refresh every 8 seconds
   - [ ] Positions < $0.10 are filtered out

**Scenario 2: Create Algo Order**
1. Select a market
2. Create a new algorithmic order
3. Verify:
   - [ ] Order parameters are validated before submission
   - [ ] Balance is checked
   - [ ] Order appears in "Active Orders" list
   - [ ] Order is stored in extension storage

**Scenario 3: Quick Sell Position**
1. Have an open position
2. Click "Quick Sell" button
3. Verify:
   - [ ] Confirmation modal appears
   - [ ] Estimated proceeds shown
   - [ ] Order executes successfully
   - [ ] Position list refreshes
   - [ ] Position is removed/reduced

**Scenario 4: View Real CLOB Orders**
1. Place a limit order on Polymarket
2. Check "Real Orders on Exchange" section
3. Verify:
   - [ ] Order appears in list
   - [ ] Auto-refresh every 10 seconds
   - [ ] Order details are correct (price, size, status)
   - [ ] Can cancel order from extension

### 4. Performance Testing

#### Memory Usage
1. Open Chrome Task Manager (Shift+Esc)
2. Run extension for 30 minutes with auto-refresh enabled
3. Verify:
   - [ ] Memory usage stays stable (< 100MB)
   - [ ] No memory leaks
   - [ ] CPU usage is minimal when idle

#### Network Requests
1. Open Chrome DevTools > Network tab
2. Monitor API calls
3. Verify:
   - [ ] Batch price fetching reduces number of requests
   - [ ] Retry logic doesn't spam failed requests
   - [ ] Cache is working (5-second TTL for positions)

### 5. Error Scenarios

**Test Error Handling:**
- [ ] Invalid private key - clear error message
- [ ] Network offline - retry with backoff, clear error message
- [ ] API rate limiting - exponential backoff, eventually succeeds
- [ ] Invalid order parameters - validation errors shown
- [ ] Insufficient balance - balance error shown
- [ ] Extension reload while page open - graceful handling

## Console Commands for Testing

Open the service worker console (`chrome://extensions/` → "service worker" link under extension):

```javascript
// Test order validation
validateOrder('0xtoken123', 'BUY', 0.001, 0.5)  // Should fail - size too small
validateOrder('0xtoken123', 'BUY', 10, 2.0)     // Should fail - price too high
validateOrder('0xtoken123', 'BUY', 1, 0.5)      // Should fail - value too small
validateOrder('0xtoken123', 'BUY', 10, 0.5)     // Should succeed

// Test retry logic
retryWithBackoff(() => Promise.reject(new Error('ECONNRESET')), { maxRetries: 2, initialDelayMs: 100 })

// Check active trading session
getActiveTradingSession()  // Should return session object if logged in

// Check CLOB orders
getOpenOrders()  // Should return open orders

// Test balance checking
getUSDCBalance()  // Should return USDC balance
getTokenBalance('0xtoken123')  // Should return token balance
```

## Automated Testing

While manual testing is important for Chrome extensions, we also have:

### Unit Tests (Bun)
```bash
cd /Users/michael.easley/Repos/magic-proxy-builder-example/chrome-extension
bun test tests/unit
```

Tests cover:
- Order validation logic
- Retry utility with exponential backoff
- Market monitor batch price fetching
- Balance checking
- Error handling

### E2E Tests (Playwright)
```bash
bun run build
bun run test:e2e
```

Optional UI mode:
```bash
bun run test:e2e:ui
```

Notes:
- Playwright loads the unpacked extension from `build/`.
- Use `HEADLESS=1` if you want headless mode.
- E2E tests can set `e2e_overrides` in `chrome.storage.local` to stub
  wallet addresses, positions, or CLOB orders without hitting live APIs.

## Troubleshooting

### Extension Not Loading
- Check `build/manifest.json` exists
- Verify webpack build completed without errors
- Check for syntax errors in service worker console

### Service Worker Not Starting
- Go to `chrome://extensions/`
- Click "service worker" link under the extension
- Check console for errors
- Try "Reload" button on extension

### Auto-Refresh Not Working
- Check service worker console for alarm setup logs
- Verify `chrome.alarms` permission in manifest
- Check for context invalidation errors

### Orders Not Executing
- Verify wallet is initialized
- Check balance (USDC for BUY, tokens for SELL)
- Verify private key has correct permissions
- Check service worker console for API errors

## Reporting Issues

When reporting bugs, please include:
1. Chrome version
2. Extension version
3. Steps to reproduce
4. Console logs (both page and service worker)
5. Screenshots if applicable
6. Network tab showing failed requests (if applicable)
