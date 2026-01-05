# Chrome Extension Quick Start

## 🚀 Load Extension in Chrome (5 minutes)

### 1. Build the Extension
```bash
cd chrome-extension
npm run build
```

### 2. Load in Chrome
1. Open Chrome and go to: **chrome://extensions/**
2. Toggle **"Developer mode"** ON (top-right corner)
3. Click **"Load unpacked"**
4. Navigate to and select: `/chrome-extension/build/`
5. Extension should now appear with green checkmark ✅

### 3. Pin the Extension
1. Click the **puzzle icon** 🧩 in Chrome toolbar
2. Find **"Polymarket Algo Trader"**
3. Click the **pin icon** 📌 to keep it visible

### 4. Open Service Worker Console
1. Go to **chrome://extensions/**
2. Find your extension
3. Click **"service worker"** link (blue text)
4. Service worker console opens → check for errors

## 🧪 Quick Test (2 minutes)

### Test 1: Extension Loads
- [x] Extension icon visible in toolbar
- [x] Click icon → popup opens
- [x] No errors in service worker console

### Test 2: Visit Polymarket
1. Go to **https://polymarket.com**
2. Look for extension UI injected on the page
3. Check page console (F12) for extension logs

### Test 3: Check New Features

Open service worker console and check for these logs:

```
✅ Auto-refresh enabled
✅ Market monitor alarm set up
✅ Service worker active
```

When you create an order, you should see:
```
✅ [TradingSession] Validating order parameters...
✅ [TradingSession] Checking balance...
✅ [MarketMonitor] Fetching prices using batch API...
```

## 🐛 Troubleshooting

### Extension Won't Load
- Check that `build/` folder exists
- Rebuild: `npm run build`
- Check for syntax errors in build output

### Service Worker Not Starting
- Click "Reload" button on extension card
- Check service worker console for errors
- Verify manifest.json is valid

### No UI on Polymarket.com
- Check that you're on polymarket.com
- Refresh the page
- Check page console for errors
- Verify content script injected: `chrome-extension://[id]/content/inject.js`

## 📊 What to Test

Based on our recent updates, focus on testing:

### ✅ Order Validation (NEW)
- Try orders with invalid size/price
- Try orders with insufficient balance
- Verify clear error messages

### ✅ Retry Logic (NEW)
- Disconnect internet
- Try to fetch data
- Watch retry attempts in console
- Reconnect and verify recovery

### ✅ Batch Price Fetching (NEW)
- Create multiple algo orders
- Check console for batch API logs
- Verify parallel fetching

### ✅ Error Handling (NEW FIX)
- Reload extension while page is open
- Verify: "Extension was reloaded. Please refresh this page."
- No repeated errors in console

## 🎯 Full Testing

For comprehensive testing, see: **[TESTING.md](./TESTING.md)**

## 📝 Unit Tests

Run automated tests:
```bash
cd /Users/michael.easley/Repos/magic-proxy-builder-example
npm run test:run -- tests/chrome-extension/
```

Expected output:
```
✓ tests/chrome-extension/order-validation.test.ts (19 tests)
✓ tests/chrome-extension/retry-utility.test.ts (13 tests)
✓ tests/chrome-extension/market-monitor.test.ts (15 tests)

Test Files  3 passed (3)
Tests       47 passed (47)
```

## 🔍 Debug Tips

### View Extension Storage
In service worker console:
```javascript
chrome.storage.local.get(null, console.log)
```

### View Alarms
```javascript
chrome.alarms.getAll(console.log)
```

### Test Order Validation
```javascript
// In page console (where extension is active)
chrome.runtime.sendMessage(
  {
    type: 'CREATE_ALGO_ORDER',
    order: {
      type: 'TRAILING_STOP',
      tokenId: '0x123...',
      side: 'BUY',
      size: 0.001, // Too small - will fail validation
      price: 0.5
    }
  },
  console.log
)
```

## Next Steps

1. ✅ Load extension in Chrome
2. ✅ Test basic functionality
3. ✅ Test new features (validation, retry, batch)
4. ✅ Report any issues found
5. 📋 Follow full testing guide in TESTING.md
