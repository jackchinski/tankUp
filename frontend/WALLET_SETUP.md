# Wallet Integration Setup

This project now includes full wallet connectivity using Reown (WalletConnect) and balance fetching using wagmi.

## Setup Instructions

### 1. Get a Reown Project ID

1. Go to [https://cloud.reown.com](https://cloud.reown.com)
2. Create an account or sign in
3. Create a new project
4. Copy your Project ID

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
VITE_REOWN_PROJECT_ID=your_project_id_here
```

Or copy from the example:
```bash
cp .env.example .env
```

Then edit `.env` and add your actual project ID.

### 3. Install Dependencies

Dependencies are already installed, but if you need to reinstall:

```bash
npm install
```

## Features Implemented

### ✅ Wallet Connection
- Connect wallet using Reown AppKit
- Supports all major wallets (MetaMask, WalletConnect, Coinbase Wallet, etc.)
- Displays connected address in header
- Click address to open account modal

### ✅ Chain Switching
- Select source chain from chain selector
- Automatically prompts user to switch chain in wallet if needed
- Updates token balances when chain changes

### ✅ Token Balance Fetching
- Automatically fetches balances for:
  - Native tokens (ETH, MATIC, BNB, AVAX, etc.)
  - ERC20 tokens (USDC, USDT, WETH)
- Balances update when:
  - Wallet connects
  - Chain switches
  - Component remounts

### ✅ Supported Chains
- Ethereum (Mainnet)
- Base
- Arbitrum
- Optimism
- Polygon
- BNB Chain
- Avalanche
- Scroll
- Zora

### ✅ Supported Tokens
- ETH (native)
- USDC
- USDT
- WETH

Token addresses are configured per chain in `src/data/tokens.js`.

## Usage

1. **Connect Wallet**: Click "Connect Wallet" button in header
2. **Select Chain**: Click source chain selector to choose network
3. **Select Token**: Click token selector to choose token (shows real balances)
4. **View Balances**: Real-time balances are displayed for all tokens

## Architecture

- **Reown AppKit**: Handles wallet connection UI and wallet interactions
- **wagmi**: Provides React hooks for blockchain interactions
- **viem**: Low-level Ethereum library for contract calls
- **Custom Hooks**: `useTokenBalances` fetches balances for all tokens on current chain

## Files Modified/Created

- `src/config/wagmi.js` - Wagmi and Reown configuration
- `src/providers/WalletProvider.jsx` - Wallet provider wrapper
- `src/hooks/useTokenBalances.js` - Custom hook for fetching token balances
- `src/context/GasFountainContext.jsx` - Updated to include wallet state and balances
- `src/components/Header.jsx` - Real wallet connection
- `src/components/Step1Destinations.jsx` - Uses real balances
- `src/components/Step2Source.jsx` - Uses real balances
- `src/data/tokens.js` - Token addresses per chain
- `src/data/chains.js` - Added viem chain mappings
- `src/main.jsx` - Added WalletProvider wrapper

## Troubleshooting

### Wallet won't connect
- Make sure you have a valid `VITE_REOWN_PROJECT_ID` in `.env`
- Check browser console for errors
- Try a different wallet

### Balances not showing
- Make sure wallet is connected
- Check that you're on the correct chain
- Some tokens may not exist on all chains (check `src/data/tokens.js`)

### Chain switch not working
- Make sure the chain is supported in your wallet
- Some wallets require manual chain addition
- Check browser console for errors

