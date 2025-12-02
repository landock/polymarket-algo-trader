# Polymarket Magic Link Integration Demo

A Next.js application demonstrating how to integrate Polymarket trading for users who've previously logged into and traded on Polymarket.com via **Magic Link (email/Google OAuth)**.

Non-Safe Proxy Wallets are deployed for Magic users on `Polymarket.com`. If your goal is to enable these traders to manage the same account on both apps, you will need to interact with this custom proxy wallet that's only used for Magic users.

This demo covers;

- User importing Magic wallet private keys as authentication (no storage)
- Derivation of the **Non-Safe Proxy Wallet** address deterministically (does not deploy)
- Obtaining **User API Credentials** from the CLOB client
- Place orders with Magic Link EOA signature through the Proxy Wallet
- Manage positions and active orders

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Core Integration Patterns](#core-integration-patterns)
   - [Flow Overview](#flow-overview)
   - [New User Flow](#new-user-flow)
   - [Returning User Flow](#returning-user-flow)
4. [Key Implementation Details](#key-implementation-details)
   - [1. Magic Wallet Private Key Input](#1-magic-wallet-private-key-input)
   - [2. Proxy Wallet Derivation](#2-proxy-wallet-derivation)
   - [3. User API Credentials](#3-user-api-credentials)
   - [4. Authenticated ClobClient](#4-authenticated-clobclient)
   - [5. Placing Orders](#5-placing-orders)
   - [6. Position & Order Management](#6-position--order-management)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Key Dependencies](#key-dependencies)

---

## Prerequisites

Before running this demo, you need:

1. **Magic Link Account on Polymarket**
   - Visit `polymarket.com` and sign up via Magic Link (email/Google)
   - Complete at least one trade to deploy your proxy wallet and set token approvals

2. **Magic Wallet Private Key**
   - Visit [reveal.magic.link/polymarket](https://reveal.magic.link/polymarket) after creating the account on `polymarket.com` and conducting one trade
   - Get your private key

3. **Polygon RPC URL**
   - Any Polygon mainnet RPC (Alchemy, Infura, or public RPC)
   - Defaults to a public RPC URL

4. **USDC.e Funds**
   - Send USDC.e to the **Non-Safe Proxy Wallet** (not EOA) for trading
   - If unsure of your Non-Safe Proxy Wallet address, get it from either the listed address on `polymarket.com`after logging in, or simply start this demo and input your private key

---

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Create `.env.local`:

```bash
# Polygon RPC endpoint
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com

# Or use Alchemy/Infura:
# NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Core Integration Patterns

### Flow Overview

This application demonstrates how Magic Link users can trade on external Polymarket integrations with the same Non-Safe Proxy Wallet:

#### **User Flow**

1. User has a history of trading on `polymarket.com` via email login / Google OAuth
2. User obtains and submits Magic wallet private key to authenticate into demo app
3. App derives deterministic **Non-Safe Proxy Wallet** address
4. Display both EOA (signing wallet) and Proxy (funding/trading wallet) address
5. Initialize **ClobClient** with Magic signature type (signatureType: 1)
6. Obtain **User API Credentials** via `createOrDeriveApiKey()`
7. Initialize authenticated **ClobClient** with credentials
8. Ready to trade

---

## Key Implementation Details

### 1. Magic Wallet Private Key Input

**File**: `components/Header.tsx`

Users paste their Magic wallet private key (obtained from reveal.magic.link) into the app. This creates an ethers Wallet instance for signing.

```typescript
import { Wallet } from "ethers";

const wallet = new Wallet(privateKey);
const eoaAddress = wallet.address;
```

**⚠️ Security Warning**: This demo stores the private key in React state for simplicity. **This is NOT production-ready**. In production, use secure key management solutions or server-side signing.

---

### 2. Proxy Wallet Derivation

**File**: `hooks/useProxyWallet.ts`

Polymarket's Magic auth creates a **Non-Safe Proxy Wallet** (EIP-1167 minimal proxy) that is deterministically derived from the user's EOA using CREATE2.

```typescript
import { keccak256, getAddress, concat } from "viem";

const PROXY_FACTORY = "0xaB45c5A4B0c941a2F231C04C3f49182e1A254052";
const PROXY_IMPLEMENTATION = "0x44e999d5c2F66Ef0861317f9A4805AC2e90aEB4f";

// CREATE2 derivation
const salt = keccak256(eoaAddress);
const initCode = concat([
  "0x3d602d80600a3d3981f3363d3d373d3d3d363d73",
  PROXY_IMPLEMENTATION,
  "0x5af43d82803e903d91602b57fd5bf3",
]);
const initCodeHash = keccak256(initCode);
const hash = keccak256(concat(["0xff", PROXY_FACTORY, salt, initCodeHash]));
const proxyAddress = getAddress(`0x${hash.slice(26)}`);
```

**Key Points:**

- Polymarket does not deploy a Safe Proxy Wallet for Magic users, like the one's deployed by using the Relayer Client.
- Proxy address is **deterministic** - same EOA always gets same proxy address
- Proxy is the "funder" address that holds USDC.e and outcome tokens
- User must fund the **Proxy Wallet**, not the EOA
- Proxy must be deployed by Polymarket and token approvals set during their first trade (happens after first login and trade at `polymarket.com`)

---

### 3. User API Credentials

**File**: `hooks/useClobClient.ts`

User API Credentials are obtained by creating a temporary **ClobClient** and calling `createOrDeriveApiKey()`.

```typescript
import { ClobClient } from "@polymarket/clob-client";

// Create temporary CLOB client (no credentials yet)
const tempClient = new ClobClient(
  "https://clob.polymarket.com",
  137, // Polygon chain ID
  wallet // Magic EOA signer
);

// Get or create credentials (prompts user signature)
const creds = await tempClient.createOrDeriveApiKey();
// creds = { key: string, secret: string, passphrase: string }
```

**Flow:**

1. **First-time users**: `createOrDeriveApiKey()` creates new credentials
2. **Returning users**: Same method retrieves existing credentials
3. Requires user signature (EIP-712)
4. Credentials are stored in localStorage for current session so not all CLOB requests prompts the user for a signature

**Important:**

Credentials can be used to view orders and cancel limit orders, but **cannot place new orders without the private key**. Storing credentials in localStorage is **not recommended for production** due to XSS risks. Use secure httpOnly cookies or server-side session management in production.

---

### 4. Authenticated ClobClient

**File**: `hooks/useClobClient.ts`

After obtaining User API Credentials, create the authenticated **ClobClient**.

```typescript
import { ClobClient } from "@polymarket/clob-client";

const clobClient = new ClobClient(
  "https://clob.polymarket.com",
  137, // Polygon chain ID
  wallet, // EOA signer
  userApiCredentials, // { key, secret, passphrase }
  1, // signatureType = 1 for Magic Link users
  proxyAddress // funder address (Proxy Wallet)
);
```

**Parameters Explained:**

- **wallet**: EOA signer created from private key
- **userApiCredentials**: Obtained from Step 3
- **signatureType = 1**: Magic Link signature type (vs. 2 for browser wallets)
- **proxyAddress**: The proxy wallet that holds funds

**This is the persistent client used for all trading operations.**

---

### 5. Placing Orders

**File**: `hooks/useClobOrder.ts`

With the authenticated ClobClient, you can place market and limit orders.

#### Market Orders

```typescript
// Get current price from orderbook
const priceResponse = await clobClient.getPrice(tokenId, side);
const currentPrice = parseFloat(priceResponse.price);

// Apply aggressive pricing for immediate fills
const aggressivePrice =
  side === "BUY"
    ? Math.min(0.99, currentPrice * 1.05) // +5% above market
    : Math.max(0.01, currentPrice * 0.95); // -5% below market

// Submit as limit order with aggressive price
const order = {
  tokenID: tokenId,
  price: aggressivePrice,
  size: shares,
  side: side,
  feeRateBps: 0,
  expiration: 0,
  taker: "0x0000000000000000000000000000000000000000",
};

await clobClient.createAndPostOrder(order, { negRisk }, OrderType.GTC);
```

**Why Aggressive Pricing?**

Polymarket's CLOB doesn't have true "market orders". We simulate market execution with limit orders at aggressive prices likely to fill immediately.

#### Limit Orders

```typescript
const limitOrder = {
  tokenID: tokenId,
  price: userPrice, // User-specified (0.01 to 0.99)
  size: shares,
  side: "BUY" | "SELL",
  feeRateBps: 0,
  expiration: 0, // 0 = Good-til-Cancel
  taker: "0x0000000000000000000000000000000000000000",
};

await clobClient.createAndPostOrder(
  limitOrder,
  { negRisk: false },
  OrderType.GTC
);
```

**Key Points:**

- Orders are signed by the user's EOA
- Executed from the Proxy address (funder)
- Gasless execution (no gas fees for users)
- Prompts user signature for each order

---

### 6. Position & Order Management

**Positions** (`hooks/useUserPositions.ts`, `app/api/polymarket/positions/route.ts`):

```typescript
// Fetch from Data API
const response = await fetch(
  `https://data-api.polymarket.com/positions?user=${proxyAddress}&sizeThreshold=0.01&limit=500`
);
```

**Active Orders** (`hooks/useActiveOrders.ts`):

```typescript
// Fetch from CLOB client
const allOrders = await clobClient.getOpenOrders();
const userOrders = allOrders.filter(
  (o) =>
    o.maker_address.toLowerCase() === proxyAddress.toLowerCase() &&
    o.status === "LIVE"
);
```

**Cancel Order**:

```typescript
await clobClient.cancelOrder({ orderID: orderId });
```

---

## Project Structure

### Core Implementation Files

```
magic-pk/
├── app/
│   ├── api/
│   │   └── polymarket/
│   │       ├── market-by-token/
│   │       │   └── route.ts              # Market lookup by token ID
│   │       ├── markets/
│   │       │   └── route.ts              # High-volume markets (Gamma API)
│   │       └── positions/
│   │           └── route.ts              # User positions (Data API)
│   ├── layout.tsx                        # React Query provider
│   └── page.tsx                          # Main application UI
│
├── hooks/
│   ├── useWalletFromPK.ts                # Create wallet from private key
│   ├── useProxyWallet.ts                 # Derive proxy address
│   ├── useClobClient.ts                  # CLOB client initialization
│   ├── useClobOrder.ts                   # Order placement/cancellation
│   ├── useActiveOrders.ts                # Fetch open orders
│   ├── useUserPositions.ts               # Fetch user positions
│   ├── usePolygonBalances.ts             # Check USDC.e balance
│   └── useHighVolumeMarkets.ts           # Fetch markets
│
├── components/
│   ├── Header.tsx                        # PK input, wallet display
│   ├── PolygonAssets.tsx                 # Balance display
│   ├── Trading/
│   │   ├── MarketTabs.tsx                # Tab navigation
│   │   ├── Markets/
│   │   │   └── index.tsx                 # Market browser
│   │   ├── OrderModal/
│   │   │   └── index.tsx                 # Order placement UI
│   │   ├── Positions/
│   │   │   └── index.tsx                 # Position cards
│   │   └── Orders/
│   │       └── index.tsx                 # Open orders list
│   └── TradingSession/
│       └── index.tsx                     # CLOB authentication UI
│
├── providers/
│   ├── QueryProvider.tsx                 # TanStack Query setup
│   ├── TradingClientProvider.tsx         # Context for CLOB client
│   └── WalletProvider.tsx                # Wallet context
│
└── constants/
    ├── polymarket.ts                     # API URLs
    └── tokens.ts                         # Token addresses
```

---

## Environment Variables

Create `.env.local`:

```bash
# Required: Polygon RPC
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
```

---

## Key Dependencies

| Package                                                                | Version  | Purpose                                     |
| ---------------------------------------------------------------------- | -------- | ------------------------------------------- |
| [`@polymarket/clob-client`](https://github.com/Polymarket/clob-client) | ^4.22.8  | Order placement, User API credentials       |
| [`@tanstack/react-query`](https://tanstack.com/query)                  | ^5.90.10 | Server state management                     |
| [`ethers`](https://docs.ethers.org/v5/)                                | ^5.8.0   | Wallet creation, signing, EIP-712 messages  |
| [`viem`](https://viem.sh/)                                             | ^2.39.2  | Ethereum interactions, RPC calls, keccak256 |
| [`next`](https://nextjs.org/)                                          | 16.0.3   | React framework, API routes                 |

---

## Architecture Diagram

```
User's Magic Wallet Private Key
         ↓
    [Create ethers Wallet]
         ↓
┌────────────────────────────────────────────────────┐
│  Session Initialization                            │
├────────────────────────────────────────────────────┤
│  1. Derive Non-Safe Proxy Wallet address (CREATE2) │
│  2. Create temporary ClobClient                    │
│  3. Get User API Credentials (createOrDeriveApiKey)│
│  4. Save credentials to localStorage               │
└────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────┐
│  Authenticated ClobClient                          │
├────────────────────────────────────────────────────┤
│  - User API Credentials                            │
│  - Signature Type: 1 (Magic Link)                  │
│  - Proxy address (funder)                          │
│  - EOA wallet (signer)                             │
└────────────────────────────────────────────────────┘
         ↓
    Place Orders
    (Market + Limit orders)
    (Standard + Neg Risk markets)
```

---

## Troubleshooting

### "Invalid private key"

- Key must start with `0x`
- Key must be 66 characters (0x + 64 hex chars)
- Get private key from [reveal.magic.link/polymarket](https://reveal.magic.link/polymarket) for a user with trading history on `polymarket.com`

### "CLOB client not initialized"

- Click "Initialize CLOB Client" button
- Ensure private key is valid
- Check browser console for authentication errors

### Balance shows $0.00

- Ensure you funded the **Proxy Wallet**, not the EOA
- Check [Polygonscan](https://polygonscan.com) for confirmation
- Verify RPC endpoint is working (check .env.local)

### Orders not appearing

- Wait 2-3 seconds for CLOB sync
- Check USDC.e balance (need funds to trade)
- Verify order was submitted successfully (browser console)

### "Proxy wallet not deployed"

- Must log in to `polymarket.com` at least once via Magic Link
- Polymarket deploys the proxy wallet on first login
- Proxy deployment happens automatically, not in this app

### "Not enough balance"

- Must have made at least one trade on `polymarket.com`

---

## Resources

### Polymarket Documentation

- [CLOB Client Docs](https://docs.polymarket.com/developers/CLOB/clients)
- [Authentication](https://docs.polymarket.com/developers/CLOB/authentication)
- [Order Placement](https://docs.polymarket.com/quickstart/orders/first-order)
- [Proxy Wallets](https://docs.polymarket.com/developers/proxy-wallet)

### GitHub Repositories

- [clob-client](https://github.com/Polymarket/clob-client)

### Other Resources

- [Magic Link Documentation](https://magic.link/docs)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [EIP-1167 Minimal Proxy](https://eips.ethereum.org/EIPS/eip-1167)

---

## Support

Questions or issues? Reach out on Telegram: **[@notyrjo](https://t.me/notyrjo)**

---

## License

MIT

---

**Built for developers exploring the Polymarket ecosystem**
