# Polymarket Algorithmic Trading Chrome Extension

Chrome extension for algorithmic trading on Polymarket with trailing stops, stop-loss/take-profit, and TWAP execution.

## Features

- **Trailing Stop Orders** - Automatically adjust stop prices as market moves in your favor
- **Stop-Loss/Take-Profit** - Set automatic exit points to manage risk
- **TWAP Execution** - Time-Weighted Average Price orders to minimize market impact
- **24/7 Market Monitoring** - Service worker continuously monitors positions and executes orders
- **Secure Key Storage** - AES-256-GCM encryption for private keys

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Chrome browser
- Magic Link account on Polymarket

### Installation

1. Install dependencies:
   ```bash
   npm run install:extension
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `chrome-extension/build/` directory

## Documentation

See the `/chrome-extension/` directory for detailed documentation:
- `QUICKSTART.md` - 5-minute setup guide
- `TESTING.md` - Manual testing checklist
- `README-CHROME-EXTENSION.md` - Complete documentation

## Development

```bash
# Watch mode with auto-rebuild
npm run dev

# Production build
npm run build

# TypeScript validation
npm run type-check

# Clean build artifacts
npm run clean
```

## Autonomous Development (Ralph Technique)

This repository includes the **Ralph Wiggum Technique** for autonomous feature development with Claude Code.

### Quick Start
```bash
# Review the PRD (Product Requirements Document)
cat plans/prd.json

# Run autonomous development loop (5 iterations)
./ralph.sh 5

# Monitor progress
cat progress.txt
```

Claude will autonomously:
1. Select highest priority features from the PRD
2. Implement them with tests and type checking
3. Commit each feature to git
4. Log progress for review

See **[RALPH-TECHNIQUE.md](./RALPH-TECHNIQUE.md)** for full documentation.

## Architecture

- **Service Worker** (`background/`) - Market monitoring and order execution
- **Content Script** (`content/`) - Injected UI on Polymarket.com
- **Popup** (`popup/`) - Extension popup and settings
- **Storage** (`storage/`) - Encrypted key management with chrome.storage

## Security

- Private keys are encrypted with AES-256-GCM
- Password-protected wallet with automatic lock
- Keys never leave the browser extension
- No remote signing services

## License

MIT
